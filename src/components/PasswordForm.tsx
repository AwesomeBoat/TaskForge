'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, apiPost } from '@/lib/api-client';

export function PasswordForm({ mode, token }: { mode: 'forgot' | 'reset'; token?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await apiPost(`/api/auth/${mode}-password`, mode === 'forgot' ? { email } : { token, password });
      setMessage(mode === 'forgot' ? 'If that account exists, a reset link has been sent.' : 'Password updated. You can sign in now.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md space-y-8">
        <header className="space-y-3 text-center"><p className="text-sm font-semibold tracking-[0.2em] text-accent">TASKFORGE</p><h1 className="text-3xl font-semibold tracking-tight text-text">{mode === 'forgot' ? 'Reset your password.' : 'Choose a new password.'}</h1><p className="text-sm text-muted">{mode === 'forgot' ? 'We will send instructions if the account exists.' : 'This link can only be used once.'}</p></header>
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card">
          {mode === 'forgot' ? <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /> : <Input label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} autoComplete="new-password" />}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {message && <p role="status" className="text-sm text-success">{message}</p>}
          <Button type="submit" size="lg" loading={loading}>{mode === 'forgot' ? 'Send reset link' : 'Update password'}</Button>
        </form>
        <p className="text-center text-sm text-muted"><Link href="/login" className="font-medium text-accent hover:text-accent-hover">Back to sign in</Link></p>
      </div>
    </main>
  );
}
