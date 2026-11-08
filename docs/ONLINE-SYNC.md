# Online sync (offline-first)

BiDOCS works fully offline on every platform. When a device is online and linked to an online account, its data is
merged with that account so the desktop, web and mobile apps show the same records.

Sync is **optional**. Without it nothing changes and no network request is made to any backend.

## Set up the backend (once)

1. Create a free project at <https://supabase.com>.
2. Run the migration: open **SQL editor**, paste `supabase/migrations/20261107000000_sync.sql` and run it
   (or `supabase db push` with the CLI). It creates the `sync_records` table, the `sync_push` function with
   last-write-wins, row level security, and a private `vault` storage bucket.
3. In **Authentication > Providers > Email** keep email sign-in on. For the simplest flow turn **off** "Confirm email";
   otherwise users must confirm their email before the first sign-in.
4. Copy the project **URL** and the **anon (public) key** from **Project settings > API**. Never use the service-role key in the app.

## Point the apps at it

Either bake the values into a build:

```bash
# .env.production (see .env.example)
VITE_SUPABASE_URL=https://YOURREF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

or leave the build generic and let a company owner or manager enter them in **Settings > Online sync** (or on the login page under
"Restore from your online account"). Installed desktop and Android apps can be configured this way without rebuilding.

Only `https://<project>.supabase.co` style hosts are accepted by default, because the URL decides where logins and company data
are sent. Self-hosting needs `VITE_ALLOW_CUSTOM_SYNC_HOST=true` at build time. The host is always shown before credentials are entered.

## Using it

- **First device:** sign in to the company, open **Settings > Online sync**, enter the online account email and a password,
  choose **Create online account**. Existing data is uploaded.
- **Another device:** on the login page choose **Restore from your online account**, sign in with the same online account.
  The company and all its data are copied to the device, and the same email and password become the login there.
  Restore only creates a company that is **not already on that device**; it never replaces an existing local login or password.
- **Offline:** keep working. Changes are saved on the device and queued. When the device is online again they upload automatically
  (within seconds, on reconnect, when the window regains focus, and every minute).
- **Header badge:** shows Synced, N waiting, Offline, or a problem. Click it to open the sync settings.
- After remote changes arrive a banner offers **Reload** so open screens show them.

## What syncs

| Synced | Not synced |
|:--|:--|
| Company profile | Local user accounts, password hashes, roles, sessions, lockout counters |
| Projects, opportunities, forms and settings data of the company | Other companies on the same device |
| Vault items and uploaded PDFs, project and opportunity attachments | Files over 25 MB (kept on the device, counted in the panel) |

One online account belongs to exactly one company; connecting a different company to it is refused.
Team members are created per device in **Settings > Team** (their logins are not uploaded).

## How merging works

- Every change gets the writing device's timestamp. For each record the **most recent edit wins**; older edits are ignored by the server.
- Deleting a record syncs as a tombstone, so a stale offline device cannot bring it back.
- Retries are safe (the same write twice has no effect). A sync that fails halfway resumes from its cursor.
- Deleting a company on a device removes it from that device only. The online copy stays until the owner uses
  **Settings > Online sync > Delete the online copy**.

Known limits: conflicts are decided per record, not per field (two people editing the same form offline keep only the later save);
device clocks should be roughly correct; the unit of upload for a vault file is the whole file.

## Security notes

- Row level security restricts every table row and storage object to its owner (`auth.uid()`); the anon key alone grants nothing.
- Data is protected in transit (TLS) and at rest by Supabase, but it is **not end-to-end encrypted**: the backend operator can read it.
  Decide whether that is acceptable for your procurement documents before enabling sync.
- Each company has its own online session on a device, stored per online project and company, bound to the account it was linked with,
  and never synced. If the device's online project is changed, companies linked to the old project show as not connected and send nothing to the new one. "Disconnect this device" signs out that device only, not your other devices.
- Only a company owner or manager can connect, disconnect, change the online project or delete the online copy.
  Other roles see a read-only status.
- Records from the server are applied only if they belong to this company (company id, item ids and payload ids must match).
- A restore-time project URL is used for that attempt only and saved only if the restore succeeds.

## Testing

```bash
npm test                  # engine rules, and the SQL migration on an in-process Postgres (PGlite)
node scripts/e2e-sync.mjs # two browser profiles + a mock Supabase server: offline, merge, conflict, restore, delete
```

`scripts/mock-supabase.mjs` implements just enough of the Supabase HTTP API for the e2e test; run it alone with
`node scripts/mock-supabase.mjs` to try the app against a throwaway backend.
