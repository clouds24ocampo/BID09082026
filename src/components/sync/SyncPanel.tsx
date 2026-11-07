import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle2, Loader2, LogOut, Trash2 } from 'lucide-react';
import { useSync, type SyncStatus } from '../../sync/SyncContext';

export const STATUS_LABEL: Record<SyncStatus, string> = {
  unconfigured: 'Not set up',
  'signed-out': 'Not connected',
  offline: 'Offline - changes saved on this device',
  syncing: 'Syncing...',
  synced: 'All changes synced',
  pending: 'Changes waiting to sync',
  error: 'Sync problem - will retry',
};

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 outline-none';
const btnPrimary =
  'min-h-10 px-4 rounded-xl text-xs font-bold text-slate-950 bg-linear-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50 cursor-pointer';
const btnGhost =
  'min-h-10 px-4 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-50 cursor-pointer';

/** Project URL + public key form, shared by Settings and the login restore flow. */
export const SyncConfigForm: React.FC<{ onSaved?: () => void }> = ({ onSaved }) => {
  const sync = useSync();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const problem = sync.saveConfig({ url: url.trim(), anonKey: key.trim() });
        setErr(problem);
        if (!problem) onSaved?.();
      }}
    >
      <label className="block text-xs text-slate-400 space-y-1.5">
        <span>Online project URL</span>
        <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://abcd1234.supabase.co" inputMode="url" autoComplete="off" />
      </label>
      <label className="block text-xs text-slate-400 space-y-1.5">
        <span>Public (anon) key</span>
        <input className={inputCls} value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJ..." autoComplete="off" />
      </label>
      {err && <p role="alert" className="text-xs text-red-400">{err}</p>}
      <button type="submit" className={btnPrimary}>Save connection</button>
    </form>
  );
};

export const SyncPanel: React.FC = () => {
  const sync = useSync();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState('');

  const connect = async (mode: 'signin' | 'signup') => {
    setBusy(true);
    setMsg(null);
    const res = await sync.connect(email, password, mode);
    setBusy(false);
    if (!res.success) setMsg(res.error || 'Could not connect.');
    else setPassword('');
  };

  const Icon = sync.status === 'offline' ? CloudOff : sync.status === 'error' ? AlertTriangle : sync.status === 'synced' ? CheckCircle2 : Cloud;

  return (
    <section className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4" aria-labelledby="sync-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="sync-title" className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Cloud className="w-4 h-4 text-cyan-400" /> Online sync
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Works fully offline. When this device is online, your company data and vault files are merged with your online
            account so every device sees the same records. The most recent edit to a record wins.
          </p>
        </div>
        {sync.linked && (
          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-200 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700" aria-live="polite">
            {sync.status === 'syncing' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Icon className="w-3.5 h-3.5 text-cyan-400" />}
            {STATUS_LABEL[sync.status]}
          </span>
        )}
      </div>

      {!sync.configured && (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">Enter the connection details of your online project (from your Supabase project settings).</p>
          <SyncConfigForm />
        </div>
      )}

      {sync.configured && !sync.linked && (
        <form className="space-y-3 max-w-md" onSubmit={(e) => { e.preventDefault(); void connect('signin'); }}>
          <p className="text-xs text-slate-300">Sign in to the online account for this company, or create one. One online account belongs to one company.</p>
          <label className="block text-xs text-slate-400 space-y-1.5">
            <span>Email</span>
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="block text-xs text-slate-400 space-y-1.5">
            <span>Online account password</span>
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {msg && <p role="alert" className="text-xs text-red-400">{msg}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Connecting...' : 'Sign in'}</button>
            <button type="button" disabled={busy} onClick={() => void connect('signup')} className={btnGhost}>Create online account</button>
          </div>
        </form>
      )}

      {sync.linked && (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3"><dt className="text-slate-500">Account</dt><dd className="text-slate-100 font-semibold truncate">{sync.email}</dd></div>
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3"><dt className="text-slate-500">Waiting to upload</dt><dd className="text-slate-100 font-semibold">{sync.pending}</dd></div>
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3"><dt className="text-slate-500">Last synced</dt><dd className="text-slate-100 font-semibold">{sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString() : 'Not yet'}</dd></div>
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3"><dt className="text-slate-500">Large files kept local</dt><dd className="text-slate-100 font-semibold">{sync.tooLarge}</dd></div>
          </dl>
          {sync.status === 'signed-out' && <p role="alert" className="text-xs text-amber-300">Your online session expired. Disconnect and sign in again to resume syncing. Nothing is lost; changes stay queued.</p>}
          {sync.error && <p role="alert" className="text-xs text-red-400">{sync.error}</p>}
          {sync.tooLarge > 0 && <p className="text-xs text-slate-400">Files over 25 MB are not uploaded automatically and stay on this device.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={sync.status === 'syncing' || sync.status === 'offline'} onClick={() => void sync.syncNow()}>
              <span className="inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Sync now</span>
            </button>
            <button type="button" className={btnGhost} onClick={() => void sync.disconnect()}>
              <span className="inline-flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> Disconnect this device</span>
            </button>
          </div>
          <details className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
            <summary className="text-xs font-semibold text-red-300 cursor-pointer">Delete the online copy</summary>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <p>Permanently removes this company's records and files from the online account. Data on your devices is not touched. Type DELETE to confirm.</p>
              <input className={inputCls} value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm" />
              <button
                type="button"
                disabled={confirmDelete !== 'DELETE' || busy}
                className="min-h-10 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1.5"
                onClick={async () => {
                  setBusy(true);
                  const r = await sync.deleteCloudCopy();
                  setBusy(false);
                  setMsg(r.success ? null : r.error || 'Could not delete the online copy.');
                  setConfirmDelete('');
                }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete online copy
              </button>
              {msg && <p role="alert" className="text-red-400">{msg}</p>}
            </div>
          </details>
        </div>
      )}
    </section>
  );
};

/** Small status pill for the app header. Renders nothing until online sync is configured. */
export const SyncBadge: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const sync = useSync();
  if (sync.status === 'unconfigured') return null;
  const Icon = sync.status === 'offline' ? CloudOff : sync.status === 'error' ? AlertTriangle : Cloud;
  const tone =
    sync.status === 'synced' ? 'text-emerald-300' : sync.status === 'error' || sync.status === 'signed-out' ? 'text-amber-300' : 'text-slate-300';
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${STATUS_LABEL[sync.status]}${sync.pending ? ` (${sync.pending} waiting)` : ''}`}
      aria-label={`Online sync: ${STATUS_LABEL[sync.status]}`}
      className={`inline-flex items-center gap-1.5 p-2.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs font-semibold cursor-pointer ${tone}`}
    >
      {sync.status === 'syncing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      <span className="hidden lg:inline">{sync.status === 'synced' ? 'Synced' : sync.status === 'pending' ? `${sync.pending} waiting` : STATUS_LABEL[sync.status].split(' - ')[0]}</span>
    </button>
  );
};

/** Shown when sync applied remote changes that the open screens have not picked up yet. */
export const SyncReloadBanner: React.FC = () => {
  const sync = useSync();
  if (!sync.needsReload) return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-cyan-950/50 border border-cyan-500/40 text-xs text-cyan-100">
      <span>Updates from your online account arrived.</span>
      <button type="button" onClick={sync.reload} className="min-h-9 px-3 rounded-lg font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 cursor-pointer">Reload to show them</button>
    </div>
  );
};
