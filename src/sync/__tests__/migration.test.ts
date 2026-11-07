// Runs the real migration SQL on an in-process Postgres (PGlite) with minimal stand-ins for Supabase's
// auth/storage schemas, then checks last-write-wins, idempotency and per-user isolation (RLS).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';
const SQL = readFileSync(resolve(__dirname, '../../../supabase/migrations/20261107000000_sync.sql'), 'utf8');

let db: PGlite;

/** Run as a Supabase "authenticated" user (RLS applies), or as anon when uid is null. */
async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('app.uid', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'};`);
  try { return await fn(); } finally { await db.exec('reset role;'); }
}
const push = (records: object[]) => db.query<{ n: number }>('select public.sync_push($1::jsonb) as n', [JSON.stringify(records)]);
const rec = (key: string, ms: number, payload: unknown = { v: key }, extra: object = {}) =>
  ({ key, tenant_id: 'tenant-x', deleted: false, payload, client_updated_ms: ms, ...extra });

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
    create table storage.objects (bucket_id text, name text);
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
    insert into auth.users values ('${USER_A}'), ('${USER_B}');
    grant usage on schema auth, storage to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
  `);
  await db.exec(SQL);
  await db.exec('grant select, insert, update, delete on public.sync_records to authenticated; grant usage on sequence public.sync_records_seq to authenticated;');
});

describe('sync migration', () => {
  it('inserts new records and returns how many were accepted', async () => {
    const r = await as(USER_A, () => push([rec('ls:a', 100), rec('ls:b', 100)]));
    expect(r.rows[0].n).toBe(2);
  });

  it('newer write replaces; older or equal write is ignored (last write wins, idempotent retries)', async () => {
    await as(USER_A, () => push([rec('ls:k', 200, { v: 'new' })]));
    const older = await as(USER_A, () => push([rec('ls:k', 150, { v: 'old' })]));
    const same = await as(USER_A, () => push([rec('ls:k', 200, { v: 'retry' })]));
    expect(older.rows[0].n).toBe(0);
    expect(same.rows[0].n).toBe(0);
    const row = await as(USER_A, () => db.query<{ payload: { v: string } }>("select payload from public.sync_records where key = 'ls:k'"));
    expect(row.rows[0].payload.v).toBe('new');
    const newer = await as(USER_A, () => push([rec('ls:k', 300, { v: 'newest' })]));
    expect(newer.rows[0].n).toBe(1);
  });

  it('tombstones win over older data and carry no payload', async () => {
    await as(USER_A, () => push([rec('ls:gone', 400)]));
    await as(USER_A, () => push([rec('ls:gone', 500, null, { deleted: true })]));
    const row = await as(USER_A, () => db.query<{ deleted: boolean }>("select deleted from public.sync_records where key = 'ls:gone'"));
    expect(row.rows[0].deleted).toBe(true);
  });

  it('every accepted write gets a strictly increasing server_seq (cursor pulls never miss changes)', async () => {
    const before = await as(USER_A, () => db.query<{ m: string }>('select coalesce(max(server_seq),0) as m from public.sync_records'));
    await as(USER_A, () => push([rec('ls:s1', 1000), rec('ls:s2', 1000)]));
    await as(USER_A, () => push([rec('ls:s1', 2000)]));
    const after = await as(USER_A, () => db.query<{ key: string; server_seq: string }>(
      'select key, server_seq from public.sync_records where server_seq > $1 order by server_seq', [before.rows[0].m]));
    const seqs = after.rows.map((r) => Number(r.server_seq));
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(after.rows.map((r) => r.key)).toContain('ls:s1');
  });

  it('users only ever see and change their own rows (RLS)', async () => {
    await as(USER_B, () => push([rec('ls:b-only', 100)]));
    const aSees = await as(USER_A, () => db.query("select key from public.sync_records where key = 'ls:b-only'"));
    expect(aSees.rows).toHaveLength(0);
    // Same key, different user: independent rows, no cross-user overwrite.
    await as(USER_B, () => push([rec('ls:a', 9999, { v: 'B-data' })]));
    const aRow = await as(USER_A, () => db.query<{ payload: { v: string } }>("select payload from public.sync_records where key = 'ls:a'"));
    expect(aRow.rows[0].payload.v).toBe('ls:a');
    // Direct writes cannot spoof another user_id.
    await expect(as(USER_A, () => db.query(
      "insert into public.sync_records (user_id, key, tenant_id, client_updated_ms) values ($1, 'ls:spoof', 't', 1)", [USER_B],
    ))).rejects.toThrow();
  });

  it('rejects anonymous callers and malformed input', async () => {
    await expect(as(null, () => push([rec('ls:x', 1)]))).rejects.toThrow();
    await expect(as(USER_A, () => db.query("select public.sync_push('{}'::jsonb)"))).rejects.toThrow(/json array/);
  });

  it('creates a private vault bucket', async () => {
    const b = await db.query<{ public: boolean }>("select public from storage.buckets where id = 'vault'");
    expect(b.rows[0].public).toBe(false);
  });
});
