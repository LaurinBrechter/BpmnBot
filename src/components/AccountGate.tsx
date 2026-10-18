import { AuthenticateWithRedirectCallback, useAuth, useSignIn, useUser } from '@clerk/clerk-react';
import { useState } from 'react';
import useSWR from 'swr';
import { api } from '../auth-client';
import App from '../App';
import type { Session } from '../hooks/useSessionStorage';
import SharedDiagramView from './SharedDiagramView';

export interface Workspace { sessions: Session[]; revision: number }

function WorkspaceLoader({ userId }: { userId: string }) {
  const { getToken, signOut } = useAuth();
  const { data, error, mutate } = useSWR<Workspace>(['workspace', userId], () => api('/api/workspace', undefined, getToken), { revalidateOnFocus: false, revalidateOnReconnect: false });
  if (error) return <div className="p-8 text-white"><p role="alert">Could not load your diagrams. Nothing has been overwritten.</p><button onClick={() => void mutate()}>Retry</button><button className="ml-6" onClick={() => void signOut()}>Sign out</button></div>;
  if (!data) return <p className="p-8 text-white" role="status">Loading your diagrams…</p>;
  return <App initialWorkspace={data} />;
}

function GoogleSignIn() {
  const { signIn, isLoaded } = useSignIn();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function continueWithGoogle() {
    if (!isLoaded) return;
    setBusy(true);
    setError('');
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch {
      setError('Google sign-in could not start. Please try again.');
      setBusy(false);
    }
  }

  return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
      <p className="text-indigo-400 text-sm font-semibold mb-8">DIAGRAM STUDIO</p>
      <h1 className="text-3xl font-semibold tracking-tight">Welcome.</h1>
      <p className="text-slate-400 mt-3 mb-8">Keep your diagrams in one place. Pick up anywhere, and share only what you choose.</p>
      <button disabled={!isLoaded || busy} onClick={() => void continueWithGoogle()} className="flex w-full items-center justify-center gap-3 rounded-lg bg-white p-3 font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-50">
        <span aria-hidden="true" className="text-lg font-bold text-blue-600">G</span>
        {busy ? 'Opening Google…' : 'Continue with Google'}
      </button>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      <p className="mt-8 text-xs text-slate-500">Private by default. Existing browser diagrams can be imported after signing in.</p>
    </section>
  </main>;
}

function SignedInWorkspace() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return <p role="status" className="p-8 text-white">Opening Diagram Studio…</p>;
  if (!user) return <GoogleSignIn />;
  return <WorkspaceLoader key={user.id} userId={user.id} />;
}

export default function AccountGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const params = new URLSearchParams(location.search);
  if (params.has('share')) return <SharedDiagramView token={params.get('share') || ''} owner={params.get('owner') || ''} />;
  if (location.pathname === '/sso-callback') return <AuthenticateWithRedirectCallback />;
  if (!isLoaded) return <p role="status" className="p-8 text-white">Opening Diagram Studio…</p>;
  return isSignedIn ? <SignedInWorkspace /> : <GoogleSignIn />;
}
