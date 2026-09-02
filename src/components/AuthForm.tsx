'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, apiPost } from '@/lib/api-client';
import { browserTimezone } from '@/lib/dates';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSignup = mode === 'signup';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost(`/api/auth/${mode}`, {
        email,
        password,
        ...(isSignup ? { displayName } : {}),
        timezone: browserTimezone(),
      });
      window.location.assign('/');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Try again.');
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md space-y-8">
        <header className="space-y-3 text-center">
          <p className="text-sm font-semibold tracking-[0.2em] text-accent">TASKFORGE</p>
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            {isSignup ? 'Make room for what matters.' : 'Welcome back.'}
          </h1>
          <p className="text-sm text-muted">A calmer place to finish the things that count.</p>
        </header>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card">
          {isSignup && (
            <Input label="Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required autoComplete="name" />
          )}
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={isSignup ? 10 : 1} autoComplete={isSignup ? 'new-password' : 'current-password'} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" loading={loading}>{isSignup ? 'Create account' : 'Sign in'}</Button>
          {!isSignup && <Link href="/forgot-password" className="block text-center text-sm text-muted hover:text-accent">Forgot your password?</Link>}
        </form>

        <p className="text-center text-sm text-muted">
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <Link href={isSignup ? '/login' : '/signup'} className="font-medium text-accent hover:text-accent-hover">
            {isSignup ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </main>
  );
}
