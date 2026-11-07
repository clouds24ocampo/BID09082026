/**
 * Offline-first sync engine (pure logic, no browser or Supabase imports).
 *
 * Model: every synced thing is a record with a string key, a writer timestamp and a tombstone flag.
 *   - Local writes are tracked (`track`) and queued; they never wait for the network.
 *   - `sync()` pushes the queue, then pulls everything the server has after our cursor.
 *   - Conflicts resolve per key, last write wins by writer timestamp (ties keep what we have).
 *   - Deletions travel as tombstones.
 *
 * ponytail: LWW uses device clocks, so a badly wrong clock can win conflicts it should lose.
 * Upgrade to server-assigned versions if clock skew shows up in practice.
 */

export interface SyncRecord {
  key: string;
  tenantId: string;
  deleted: boolean;
  /** Writer's clock in epoch ms. */
  updatedAt: number;
  /** ls: { v: string } | vi: vault item | tenant: Tenant | blob: { size: number } */
  payload: unknown;
}

export interface RemoteRecord extends SyncRecord {
  seq: number;
}

export interface Remote {
  /** Server enforces last-write-wins; an older record is silently ignored. */
  push(records: SyncRecord[]): Promise<void>;
  pull(afterSeq: number, limit: number): Promise<RemoteRecord[]>;
  uploadBlob(tenantId: string, id: string, dataUrl: string): Promise<void>;
  downloadBlob(tenantId: string, id: string): Promise<string | null>;
  deleteBlob(tenantId: string, id: string): Promise<void>;
}

export interface LocalSnapshot {
  exists: boolean;
  payload?: unknown;
  /** Blob records only: the data URL to upload. */
  blob?: string;
}

export interface Local {
  /** Current local value of a key, or `exists: false` when it was deleted. */
  snapshot(key: string): Promise<LocalSnapshot>;
  /** Apply a remote change locally without re-queueing it. `blob` is set for blob records. */
  apply(record: RemoteRecord, blob: string | null): Promise<void>;
}

export interface SyncState {
  cursor: number;
  /** key -> tenantId for local changes not yet acknowledged by the server. */
  queue: Record<string, string>;
  /** key -> epoch ms of the newest known write (local or applied remote). */
  stamps: Record<string, number>;
  lastSyncAt?: number;
  /** Blob keys skipped because they exceed the automatic upload limit. */
  tooLarge: string[];
}

export interface StateStore {
  load(): SyncState;
  save(state: SyncState): void;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  applied: number;
  tooLarge: number;
}

export const BLOB_PREFIX = 'blob:';
/** Largest vault file uploaded automatically (Supabase's default per-file limit is 50 MB). */
export const MAX_AUTO_BLOB_BYTES = 25 * 1024 * 1024;
const PUSH_BATCH = 100;
const PULL_PAGE = 200;

export const emptyState = (): SyncState => ({ cursor: 0, queue: {}, stamps: {}, tooLarge: [] });

const dataUrlBytes = (dataUrl: string): number => {
  const comma = dataUrl.indexOf(',');
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
};

export class SyncEngine {
  private state: SyncState;
  private running: Promise<SyncResult> | null = null;

  constructor(
    private readonly tenantId: string,
    private readonly remote: Remote,
    private readonly local: Local,
    private readonly store: StateStore,
    private readonly now: () => number = Date.now,
  ) {
    this.state = store.load();
  }

  /** Record that a key changed locally (call for sets and deletes). Cheap and offline-safe. */
  track(key: string): void {
    this.state.stamps[key] = this.now();
    this.state.queue[key] = this.tenantId; // deleted-or-not is read from the local snapshot at push time
    this.persist();
  }

  /** Queue existing local data on first link. Unknown history counts as oldest so newer remote data wins. */
  enqueueExisting(keys: Iterable<string>): void {
    for (const key of keys) {
      if (this.state.stamps[key] === undefined) this.state.stamps[key] = 1;
      this.state.queue[key] = this.tenantId;
    }
    this.persist();
  }

  status() {
    return {
      pending: Object.keys(this.state.queue).length,
      cursor: this.state.cursor,
      lastSyncAt: this.state.lastSyncAt,
      tooLarge: [...this.state.tooLarge],
    };
  }

  /** One push-then-pull round. Concurrent calls share the same run. */
  sync(): Promise<SyncResult> {
    if (!this.running) {
      this.running = this.run().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  private persist() {
    this.store.save(this.state);
  }

  private async run(): Promise<SyncResult> {
    const result: SyncResult = { pushed: 0, pulled: 0, applied: 0, tooLarge: 0 };
    await this.pushQueue(result);
    await this.pullAll(result);
    this.state.lastSyncAt = this.now();
    result.tooLarge = this.state.tooLarge.length;
    this.persist();
    return result;
  }

  private async pushQueue(result: SyncResult) {
    const keys = Object.keys(this.state.queue);
    for (let i = 0; i < keys.length; i += PUSH_BATCH) {
      const batch: SyncRecord[] = [];
      const sentStamps: Record<string, number> = {};

      for (const key of keys.slice(i, i + PUSH_BATCH)) {
        const stamp = this.state.stamps[key] ?? this.now();
        const snap = await this.local.snapshot(key);

        if (key.startsWith(BLOB_PREFIX)) {
          const id = key.slice(BLOB_PREFIX.length);
          if (snap.exists && snap.blob !== undefined) {
            if (dataUrlBytes(snap.blob) > MAX_AUTO_BLOB_BYTES) {
              if (!this.state.tooLarge.includes(key)) this.state.tooLarge.push(key);
              delete this.state.queue[key];
              continue;
            }
            await this.remote.uploadBlob(this.tenantId, id, snap.blob);
            this.state.tooLarge = this.state.tooLarge.filter((k) => k !== key);
            batch.push({ key, tenantId: this.tenantId, deleted: false, updatedAt: stamp, payload: { size: dataUrlBytes(snap.blob) } });
          } else {
            await this.remote.deleteBlob(this.tenantId, id);
            batch.push({ key, tenantId: this.tenantId, deleted: true, updatedAt: stamp, payload: null });
          }
        } else {
          batch.push({
            key,
            tenantId: this.tenantId,
            deleted: !snap.exists,
            updatedAt: stamp,
            payload: snap.exists ? snap.payload ?? null : null,
          });
        }
        sentStamps[key] = stamp;
      }

      if (batch.length) await this.remote.push(batch);
      // Acknowledged: drop queue entries that were not rewritten while we were sending.
      for (const [key, stamp] of Object.entries(sentStamps)) {
        if (this.state.stamps[key] === stamp) delete this.state.queue[key];
      }
      result.pushed += batch.length;
      this.persist();
    }
  }

  private async pullAll(result: SyncResult) {
    for (;;) {
      const page = await this.remote.pull(this.state.cursor, PULL_PAGE);
      for (const rec of page) {
        result.pulled++;
        const known = this.state.stamps[rec.key] ?? 0;
        if (rec.updatedAt > known) {
          const blob =
            rec.key.startsWith(BLOB_PREFIX) && !rec.deleted
              ? await this.remote.downloadBlob(rec.tenantId, rec.key.slice(BLOB_PREFIX.length))
              : null;
          // A blob record whose file is missing server-side is skipped, not applied half-way.
          if (rec.key.startsWith(BLOB_PREFIX) && !rec.deleted && blob === null) {
            this.state.cursor = Math.max(this.state.cursor, rec.seq);
            continue;
          }
          await this.local.apply(rec, blob);
          this.state.stamps[rec.key] = rec.updatedAt;
          delete this.state.queue[rec.key]; // remote was newer than our pending write
          result.applied++;
        }
        this.state.cursor = Math.max(this.state.cursor, rec.seq);
      }
      this.persist();
      if (page.length < PULL_PAGE) return;
    }
  }
}
