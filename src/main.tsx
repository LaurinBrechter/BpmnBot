import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import AccountGate from './components/AccountGate';
import './index.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) throw new Error('VITE_CLERK_PUBLISHABLE_KEY is required');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      <AccountGate />
    </ClerkProvider>
  </React.StrictMode>
);

