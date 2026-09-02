'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, apiPost } from '@/lib/api-client';
import { browserTimezone } from '@/lib/dates';

/**
 * Only same-site paths are honoured, so a crafted `?next=` cannot bounce
 * someone to another origin after they sign in.
 */
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const isSignup = mode === 'signup';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      await apiPost(`/api/auth/${mode}`, {
        email,
        password,
        ...(isSignup ? { displayName } : {}),
        timezone: browserTimezone(),
      });
      // A full navigation so the server layout renders with the new session.
      window.location.assign(safeNextPath(searchParams.get('next')));
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFieldErrors(caught.fields ?? {});
      } else {
        setError('Something went wrong. Try again.');
      }
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md space-y-8">
        <header className="space-y-3 text-center">
          <p className="text-sm font-semibold tracking-[0.2em] text-accent">TASKFORGE</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-text">
            {isSignup ? 'Make room for what matters.' : 'Welcome back.'}
          </h1>
          <p className="text-sm text-muted">A calmer place to finish the things that count.</p>
        </header>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card">
          {isSignup && (
            <Input
              label="Name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              error={fieldErrors.displayName}
              required
              autoComplete="name"
              maxLength={60}
            />
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            hint={isSignup ? 'At least 10 characters.' : undefined}
            required
            minLength={isSignup ? 10 : 1}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" loading={loading}>
            {isSignup ? 'Create account' : 'Sign in'}
          </Button>

          {!isSignup && (
            <Link href="/forgot-password" className="block text-center text-sm text-muted hover:text-accent">
              Forgot your password?
            </Link>
          )}
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
