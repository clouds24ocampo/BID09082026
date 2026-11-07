-- BiDOCS online sync: one row per synced record, owned by a Supabase Auth user (one account per company).
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.

-- Monotonic cursor used by clients to pull "everything since I last looked".
create sequence if not exists public.sync_records_seq;

create table if not exists public.sync_records (
  user_id           uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key               text        not null,                 -- 'ls:<localStorage key>' | 'vi:<vault item id>' | 'blob:<id>' | 'tenant:<id>'
  tenant_id         text        not null,
  deleted           boolean     not null default false,   -- tombstone so deletions reach other devices
  payload           jsonb,
  client_updated_ms bigint      not null,                 -- writer's clock; last write wins per key
  server_seq        bigint      not null default nextval('public.sync_records_seq'),
  primary key (user_id, key)
);

-- Cursor reads: WHERE user_id = ? AND server_seq > ? ORDER BY server_seq
create index if not exists sync_records_user_seq_idx on public.sync_records (user_id, server_seq);

alter table public.sync_records enable row level security;

-- (select auth.uid()) is evaluated once per statement instead of once per row.
create policy "sync_records_select_own" on public.sync_records
  for select to authenticated using (user_id = (select auth.uid()));
create policy "sync_records_insert_own" on public.sync_records
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "sync_records_update_own" on public.sync_records
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sync_records_delete_own" on public.sync_records
  for delete to authenticated using (user_id = (select auth.uid()));

-- Batch upsert with last-write-wins. SECURITY INVOKER: row level security still applies.
-- An incoming row only replaces an existing one when it is strictly newer, so retries are idempotent
-- and an old offline device cannot overwrite newer data. Every accepted write gets a fresh server_seq.
create or replace function public.sync_push(records jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  accepted integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(records) <> 'array' then
    raise exception 'records must be a json array' using errcode = '22023';
  end if;

  with incoming as (
    select
      (select auth.uid())                    as user_id,
      r->>'key'                              as key,
      r->>'tenant_id'                        as tenant_id,
      coalesce((r->>'deleted')::boolean, false) as deleted,
      r->'payload'                           as payload,
      (r->>'client_updated_ms')::bigint      as client_updated_ms
    from jsonb_array_elements(records) as r
  ),
  upserted as (
    insert into public.sync_records as s (user_id, key, tenant_id, deleted, payload, client_updated_ms, server_seq)
    select user_id, key, tenant_id, deleted, payload, client_updated_ms, nextval('public.sync_records_seq')
    from incoming
    on conflict (user_id, key) do update
      set tenant_id         = excluded.tenant_id,
          deleted           = excluded.deleted,
          payload           = excluded.payload,
          client_updated_ms = excluded.client_updated_ms,
          server_seq        = excluded.server_seq
      where excluded.client_updated_ms > s.client_updated_ms
    returning 1
  )
  select count(*) into accepted from upserted;
  return accepted;
end;
$$;

revoke all on function public.sync_push(jsonb) from public, anon;
grant execute on function public.sync_push(jsonb) to authenticated;

-- Private bucket for vault PDFs. Objects live under '<user id>/<tenant id>/<encoded record id>'.
insert into storage.buckets (id, name, public, file_size_limit)
values ('vault', 'vault', false, 52428800)
on conflict (id) do nothing;

create policy "vault_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vault_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vault_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vault_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
