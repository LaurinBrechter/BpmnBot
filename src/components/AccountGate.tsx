import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { authClient, api } from '../auth-client';
import App from '../App';
import type { Session } from '../hooks/useSessionStorage';
import SharedDiagramView from './SharedDiagramView';

export interface Workspace { sessions: Session[]; revision: number }
function WorkspaceLoader({ userId }: { userId: string }) {
  const { data, error, mutate } = useSWR<Workspace>(['workspace', userId], () => api('/api/workspace'), { revalidateOnFocus: false, revalidateOnReconnect: false });
  if (error) return <div className="p-8 text-white"><p role="alert">Could not load your diagrams. Nothing has been overwritten.</p><button onClick={() => void mutate()}>Retry</button><button className="ml-6" onClick={() => void authClient.signOut()}>Sign out</button></div>;
  if (!data) return <p className="p-8 text-white" role="status">Loading your diagrams…</p>;
  return <App initialWorkspace={data} />;
}
function AccountForm() {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      const credentials = { email: String(data.get('email')), password: String(data.get('password')) };
      const result = register ? await authClient.signUp.email({ ...credentials, name: String(data.get('name')) }) : await authClient.signIn.email(credentials);
      if (result.error) setError('Unable to continue. Check your details and try again.');
    } catch { setError('Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
      <p className="text-indigo-400 text-sm font-semibold mb-8">DIAGRAM STUDIO</p>
      <h1 className="text-3xl font-semibold tracking-tight">{register ? 'Your ideas, saved.' : 'Welcome back.'}</h1>
      <p className="text-slate-400 mt-3 mb-8">Keep your diagrams in one place. Pick up anywhere, and share only what you choose.</p>
      <form onSubmit={submit} className="space-y-5">
        {register && <label className="block text-sm">Name<input name="name" required maxLength={100} autoComplete="name" className="mt-2 block w-full rounded-lg bg-slate-950 border border-slate-700 p-3" /></label>}
        <label className="block text-sm">Email<input name="email" type="email" required autoComplete="email" className="mt-2 block w-full rounded-lg bg-slate-950 border border-slate-700 p-3" /></label>
        <label className="block text-sm">Password<input name="password" type="password" required minLength={8} maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} className="mt-2 block w-full rounded-lg bg-slate-950 border border-slate-700 p-3" /></label>
        {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-indigo-500 hover:bg-indigo-400 p-3 font-medium disabled:opacity-50">{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
      </form>
      <button disabled={busy} onClick={() => { setRegister(!register); setError(''); }} className="mt-6 text-sm text-indigo-300">{register ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
      <p className="mt-8 text-xs text-slate-500">Private by default. Existing browser diagrams can be imported after signing in.</p>
    </section>
  </main>;
}
export default function AccountGate() {
  const { data, isPending, error } = authClient.useSession();
  const params = new URLSearchParams(location.search);
  if (params.has('share')) return <SharedDiagramView token={params.get('share') || ''} owner={params.get('owner') || ''} />;
  if (isPending) return <p role="status" className="p-8 text-white">Opening Diagram Studio…</p>;
  if (error) return <div className="p-8 text-white"><p role="alert">Unable to check your session.</p><button onClick={() => location.reload()}>Retry</button></div>;
  if (!data?.user) return <AccountForm />;
  return <WorkspaceLoader key={data.user.id} userId={data.user.id} />;
}
