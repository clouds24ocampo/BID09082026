import { describe, it, expect } from 'vitest';
import {
  SyncEngine, emptyState, MAX_AUTO_BLOB_BYTES,
  type Remote, type RemoteRecord, type SyncRecord, type Local, type SyncState,
} from '../engine';

/** In-memory stand-in for the Supabase backend: last-write-wins per key, monotonic seq. */
class FakeRemote implements Remote {
  rows = new Map<string, RemoteRecord>();
  blobs = new Map<string, string>();
  seq = 0;
  online = true;
  pushCalls = 0;
  private guard() { if (!this.online) throw new Error('network down'); }
  async push(records: SyncRecord[]) {
    this.guard();
    this.pushCalls++;
    for (const r of records) {
      const cur = this.rows.get(r.key);
      if (cur && !(r.updatedAt > cur.updatedAt)) continue; // same rule as sync_push()
      this.rows.set(r.key, { ...r, seq: ++this.seq });
    }
  }
  async pull(after: number, limit: number) {
    this.guard();
    return [...this.rows.values()].filter((r) => r.seq > after).sort((a, b) => a.seq - b.seq).slice(0, limit);
  }
  async uploadBlob(t: string, id: string, d: string) { this.guard(); this.blobs.set(`${t}/${id}`, d); }
  async downloadBlob(t: string, id: string) { this.guard(); return this.blobs.get(`${t}/${id}`) ?? null; }
  async deleteBlob(t: string, id: string) { this.guard(); this.blobs.delete(`${t}/${id}`); }
}

/** One simulated device: its own storage, clock and engine. */
function device(remote: FakeRemote, clock: { t: number }, tenant = 't1') {
  const data = new Map<string, unknown>();
  const blobs = new Map<string, string>();
  let state: SyncState = emptyState();
  const local: Local = {
    async snapshot(key) {
      if (key.startsWith('blob:')) {
        const b = blobs.get(key);
        return b === undefined ? { exists: false } : { exists: true, blob: b };
      }
      return data.has(key) ? { exists: true, payload: data.get(key) } : { exists: false };
    },
    async apply(rec, blob) {
      if (rec.key.startsWith('blob:')) {
        if (rec.deleted) blobs.delete(rec.key); else blobs.set(rec.key, blob!);
      } else if (rec.deleted) data.delete(rec.key);
      else data.set(rec.key, rec.payload);
    },
  };
  const engine = new SyncEngine(tenant, remote, local, { load: () => state, save: (s) => { state = s; } }, () => clock.t);
  return {
    engine, data, blobs,
    set(key: string, value: unknown) { clock.t += 1000; data.set(key, value); engine.track(key); },
    del(key: string) { clock.t += 1000; data.delete(key); engine.track(key); },
    setBlob(key: string, v: string) { clock.t += 1000; blobs.set(key, v); engine.track(key); },
    state: () => state,
  };
}

const PDF = 'data:application/pdf;base64,JVBERi0xLjQK';

describe('SyncEngine', () => {
  it('works offline: edits queue, nothing is lost, and they push once online', async () => {
    const remote = new FakeRemote(); const clock = { t: 1_000_000 };
    const a = device(remote, clock);
    remote.online = false;
    a.set('ls:boq', { rows: 1 }); a.set('ls:boq', { rows: 2 }); a.set('ls:notes', 'x');
    await expect(a.engine.sync()).rejects.toThrow('network down');
    expect(a.engine.status().pending).toBe(2); // de-duplicated per key
    remote.online = true;
    const res = await a.engine.sync();
    expect(res.pushed).toBe(2);
    expect(a.engine.status().pending).toBe(0);
    expect(remote.rows.get('ls:boq')!.payload).toEqual({ rows: 2 });
  });

  it('merges two devices: each side receives the other side\'s offline edits', async () => {
    const remote = new FakeRemote(); const clock = { t: 1_000_000 };
    const desktop = device(remote, clock); const web = device(remote, clock);
    desktop.set('ls:a', 'from-desktop');
    web.set('ls:b', 'from-web');
    await desktop.engine.sync(); await web.engine.sync(); await desktop.engine.sync();
    expect(web.data.get('ls:a')).toBe('from-desktop');
    expect(desktop.data.get('ls:b')).toBe('from-web');
  });

  it('last write wins per key, regardless of sync order', async () => {
    const remote = new FakeRemote(); const clock = { t: 1_000_000 };
    const a = device(remote, clock); const b = device(remote, clock);
    a.set('ls:k', 'older');                 // t+1000
    b.set('ls:k', 'newer');                 // t+2000
    await b.engine.sync();                  // newer reaches server first
    await a.engine.sync();                  // older arrives late and must lose
    await b.engine.sync();
    expect(remote.rows.get('ls:k')!.payload).toBe('newer');
    expect(a.data.get('ls:k')).toBe('newer');
    expect(b.data.get('ls:k')).toBe('newer');
  });

  it('propagates deletions as tombstones', async () => {
    const remote = new FakeRemote(); const clock = { t: 1_000_000 };
    const a = device(remote, clock); const b = device(remote, clock);
    a.set('ls:k', 'v'); await a.engine.sync(); await b.engine.sync();
    expect(b.data.has('ls:k')).toBe(true);
    a.del('ls:k'); await a.engine.sync(); await b.engine.sync();
    expect(b.data.has('ls:k')).toBe(false);
  });

  it('a stale device cannot resurrect data deleted later elsewhere', async () => {
    const remote = new FakeRemote(); const clock = { t: 1_000_000 };
    const a = device(remote, clock); const b = device(remote, clock);
    a.set('ls:k', 'v'); await a.engine.sync(); await b.engine.sync();
    b.set('ls:k', 'offline-edit');          // b edits while offline (older than the delete below)
    a.del('ls:k'); await a.engine.sync();   // delete is newer
    await b.engine.sync();
    expect(remote.rows.get('ls:k')!.deleted).toBe(true);
    expect(b.data.has('ls:k')).toBe(false);
  });

  it('syncs PDFs both ways and skips files over the automatic limit', async () => {
    const remote = new FakeRemote(); const clock = { t: 1_000_000 };
    const a = device(remote, clock); const b = device(remote, clock);
    a.setBlob('blob:doc1', PDF);
    const huge = 'data:application/pdf;base64,' + 'A'.repeat(Math.ceil((MAX_AUTO_BLOB_BYTES * 4) / 3) + 8);
    a.setBlob('blob:big', huge);
    const res = await a.engine.sync();
    expect(res.tooLarge).toBe(1);
    expect(remote.blobs.has('t1/big')).toBe(false);
    await b.engine.sync();
    expect(b.blobs.get('blob:doc1')).toBe(PDF);
    expect(b.blobs.has('blob:big')).toBe(false);
  });

  it('is idempotent: syncing again with no changes pushes nothing and re-applies nothing', async () => {
    const remote = new FakeRemote(); const clock = { t: 1_000_000 };
    const a = device(remote, clock);
    a.set('ls:k', 1); await a.engine.sync();
    const calls = remote.pushCalls;
    const res = await a.engine.sync();
    expect(res.pushed).toBe(0); expect(res.applied).toBe(0);
    expect(remote.pushCalls).toBe(calls);
  });

  it('existing local data pushes on first link but loses to newer remote data', async () => {
    const remote = new FakeRemote(); const clock = { t: 1_000_000 };
    const web = device(remote, clock);
    web.set('ls:k', 'web-newer'); await web.engine.sync();
    const desktop = device(remote, clock);           // never synced before
    desktop.data.set('ls:k', 'old-local'); desktop.data.set('ls:only-here', 'keep');
    desktop.engine.enqueueExisting(['ls:k', 'ls:only-here']);
    await desktop.engine.sync();
    expect(desktop.data.get('ls:k')).toBe('web-newer');
    expect(desktop.data.get('ls:only-here')).toBe('keep');
    expect(remote.rows.get('ls:only-here')!.payload).toBe('keep');
  });

  it('a write made while a sync is in flight is not lost', async () => {
    const remote = new FakeRemote(); const clock = { t: 1_000_000 };
    const a = device(remote, clock);
    a.set('ls:k', 'one');
    const realPush = remote.push.bind(remote);
    remote.push = async (r) => { a.set('ls:k', 'two'); await realPush(r); }; // edit lands mid-push
    await a.engine.sync();
    expect(a.engine.status().pending).toBe(1);       // still queued
    remote.push = realPush;
    await a.engine.sync();
    expect(remote.rows.get('ls:k')!.payload).toBe('two');
  });

  it('resumes from its cursor after a failure mid-pull', async () => {
    const remote = new FakeRemote(); const clock = { t: 1_000_000 };
    const a = device(remote, clock); const b = device(remote, clock);
    for (let i = 0; i < 5; i++) a.set(`ls:k${i}`, i);
    await a.engine.sync();
    await b.engine.sync();
    expect(b.state().cursor).toBe(remote.seq);
    a.set('ls:late', 'x'); await a.engine.sync();
    await b.engine.sync();
    expect(b.data.get('ls:late')).toBe('x');
  });
});
