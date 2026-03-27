'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  getSession,
  signInWithGoogle,
  signInWithEmail,
  signUp,
  onAuthStateChange,
  getOrCreateWorkspace,
} from '@/lib/supabase/auth';
import { useWorkspace } from '@/stores/workspace';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  const setAuth = useWorkspace((s) => s.setAuth);
  const setWorkspace = useWorkspace((s) => s.setWorkspace);
  const setPlan = useWorkspace((s) => s.setPlan);
  const loadFromSupabase = useWorkspace((s) => s.loadFromSupabase);

  useEffect(() => {
    // If Supabase is not configured, run in localStorage-only mode
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function checkSession() {
      const session = await getSession();
      if (!mounted) return;

      if (session?.user) {
        await bootstrapUser(session.user.id, session.user);
        setShowAuth(false);
      } else {
        setShowAuth(true);
      }
      setLoading(false);
    }

    async function bootstrapUser(userId: string, user: { id: string; user_metadata?: Record<string, unknown>; email?: string }) {
      setAuth(userId, true);
      const ws = await getOrCreateWorkspace(user as Parameters<typeof getOrCreateWorkspace>[0]);
      if (ws) {
        setWorkspace(ws.id, ws.name);
        setPlan(ws.plan);
        await loadFromSupabase(ws.id);
      }
    }

    checkSession();

    const { unsubscribe } = onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        await bootstrapUser(session.user.id, session.user);
        setShowAuth(false);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setAuth(null, false);
        setShowAuth(true);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <span className="text-sm text-zinc-400">Loading Conduit...</span>
        </div>
      </div>
    );
  }

  if (showAuth) {
    return <SignInScreen />;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Sign-in screen component
// ---------------------------------------------------------------------------

function SignInScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = mode === 'signin'
      ? await signInWithEmail(email, password)
      : await signUp(email, password);

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === 'signup') {
      setError('Check your email for a confirmation link.');
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Conduit</h1>
          <p className="mt-1 text-sm text-zinc-400">AI-Native Content Operations</p>
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Email/Password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-zinc-400">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-zinc-400">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              placeholder="Min 6 characters"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" onClick={() => { setMode('signup'); setError(''); }} className="text-violet-400 hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('signin'); setError(''); }} className="text-violet-400 hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
