import React, { useState } from 'react';
import { CloudDownload } from 'lucide-react';
import { useSync } from '../../sync/SyncContext';
import { SyncConfigForm } from './SyncPanel';

/** Login-page flow: bring a company onto a new device from its online account. */
export const RestoreFromCloud: React.FC = () => {
  const sync = useSync();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const input =
    'w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 outline-none';

  return (
    <div className="pt-3 border-t border-slate-800/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-cyan-300 cursor-pointer"
      >
        <CloudDownload className="w-4 h-4 text-cyan-400" />
        Restore from your online account (new device)
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {!sync.configured ? (
            <>
              <p className="text-xs text-slate-400">First enter the connection details of your online project.</p>
              <SyncConfigForm />
            </>
          ) : (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                const res = await sync.restoreFromCloud(email, password);
                setBusy(false);
                if (!res.success) setError(res.error || 'Could not restore.');
              }}
            >
              <p className="text-xs text-slate-400">
                Sign in with the online account. Your company and its data are copied to this device, and the same email and password
                become your login here.
              </p>
              <input className={input} type="email" placeholder="Online account email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required aria-label="Online account email" />
              <input className={input} type="password" placeholder="Online account password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required aria-label="Online account password" />
              {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={busy} className="min-h-10 px-4 rounded-xl text-xs font-bold text-slate-950 bg-linear-to-r from-cyan-400 to-blue-500 disabled:opacity-50 cursor-pointer">
                {busy ? 'Restoring...' : 'Restore company'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
