import { useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { api } from '../auth-client';

export default function AccountToolbar({ diagramId, save, status, error }: { diagramId: string; save: () => Promise<void>; status: string; error: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
  async function run(action: () => Promise<void>) {
    setBusy(true); setNotice('');
    try { await action(); } catch (e) { setNotice(e instanceof Error ? e.message : 'Please retry.'); } finally { setBusy(false); }
  }
  return <section className="border-b border-slate-700 bg-slate-900 text-slate-100 px-6 py-2 text-sm">
    <div className="flex flex-wrap items-center gap-4">
      <span className="mr-auto text-slate-400" role="status">{status}</span>

      <button disabled={busy} onClick={() => void run(save)}>Save now</button>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>Share diagram</button>
      <span className="text-slate-400 truncate max-w-48">{user?.primaryEmailAddress?.emailAddress}</span>
      <button disabled={busy} onClick={() => void run(async () => { await save(); await signOut(); })}>Sign out</button>
    </div>
    {error && <p role="alert" className="mt-2 text-amber-300">{error} Your changes are still in this tab. Use Backup before reloading.</p>}
    {open && <div className="mt-3 pb-2 space-y-3 max-w-2xl">
      <p className="text-slate-400">Anyone with the link can view this snapshot, without an account. Chat history and API keys stay private. New links replace previous links; edits are not published automatically.</p>
      <div className="flex gap-4"><button disabled={busy} className="rounded bg-indigo-500 px-3 py-2 disabled:opacity-50" onClick={() => void run(async () => {
        await save(); const result = await api<{ token: string; owner: string }>('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ diagramId }) }, getToken);
        setLink(`${location.origin}/?share=${result.token}&owner=${encodeURIComponent(result.owner)}`);
      })}>{busy ? 'Working…' : 'Create / replace link'}</button>
      <button disabled={busy} onClick={() => void run(async () => { await api(`/api/share?id=${encodeURIComponent(diagramId)}`, { method: 'DELETE' }, getToken); setLink(''); setNotice('Sharing disabled. Previous links no longer work.'); })}>Revoke link</button></div>
      {link && <div className="flex gap-3"><input aria-label="Read-only share link" readOnly value={link} onFocus={e => e.target.select()} className="min-w-0 flex-1 rounded bg-slate-950 border border-slate-700 p-2" /><button onClick={() => void run(async () => { await navigator.clipboard.writeText(link); setNotice('Link copied.'); })}>Copy link</button><a href={link} target="_blank" rel="noreferrer">Open</a></div>}
    </div>}
    {notice && <p role="status" className="mt-2 text-indigo-200">{notice}</p>}
  </section>;
}
