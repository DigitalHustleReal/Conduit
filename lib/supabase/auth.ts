import { getSupabase } from './client';
import type { AuthUser, AuthSession } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function getSession(): Promise<AuthSession | null> {
  if (!getSupabase()) return null;
  try {
    const { data, error } = await getSupabase()!.auth.getSession();
    if (error) {
      console.warn('[auth] getSession error:', error.message);
      return null;
    }
    return data.session;
  } catch (err) {
    console.warn('[auth] getSession failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sign in / Sign up
// ---------------------------------------------------------------------------

export async function signInWithGoogle(): Promise<void> {
  if (!getSupabase()) return;
  try {
    const { error } = await getSupabase()!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined },
    });
    if (error) console.warn('[auth] signInWithGoogle error:', error.message);
  } catch (err) {
    console.warn('[auth] signInWithGoogle failed:', err);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<{ error?: string }> {
  if (!getSupabase()) return { error: 'Supabase not configured' };
  try {
    const { error } = await getSupabase()!.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  } catch (err) {
    console.warn('[auth] signInWithEmail failed:', err);
    return { error: 'Sign in failed' };
  }
}

export async function signUp(email: string, password: string): Promise<{ error?: string }> {
  if (!getSupabase()) return { error: 'Supabase not configured' };
  try {
    const { error } = await getSupabase()!.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined },
    });
    if (error) return { error: error.message };
    return {};
  } catch (err) {
    console.warn('[auth] signUp failed:', err);
    return { error: 'Sign up failed' };
  }
}

export async function signOut(): Promise<void> {
  if (!getSupabase()) return;
  try {
    await getSupabase()!.auth.signOut();
  } catch (err) {
    console.warn('[auth] signOut failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Auth state listener
// ---------------------------------------------------------------------------

export function onAuthStateChange(
  callback: (event: string, session: AuthSession | null) => void,
): { unsubscribe: () => void } {
  if (!getSupabase()) return { unsubscribe: () => {} };
  const { data } = getSupabase()!.auth.onAuthStateChange(callback);
  return { unsubscribe: () => data.subscription.unsubscribe() };
}

// ---------------------------------------------------------------------------
// Workspace bootstrapping
// ---------------------------------------------------------------------------

export async function getOrCreateWorkspace(user: AuthUser): Promise<{ id: string; name: string; plan: 'free' | 'pro' | 'business' } | null> {
  if (!getSupabase()) return null;
  try {
    // Check if user already belongs to a workspace
    const { data: memberships, error: memErr } = await getSupabase()!
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1);

    if (memErr) {
      console.warn('[auth] getOrCreateWorkspace membership query error:', memErr.message);
    }

    if (memberships && memberships.length > 0) {
      const wsId = memberships[0].workspace_id;
      const { data: ws } = await getSupabase()!.from('workspaces').select('id, name, plan').eq('id', wsId).single();
      if (ws) return { id: ws.id, name: ws.name, plan: ws.plan ?? 'free' };
    }

    // No workspace found — create one
    const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'My Site';
    const { data: newWs, error: createErr } = await getSupabase()!
      .from('workspaces')
      .insert({ name: `${displayName}'s Workspace`, owner_id: user.id, plan: 'free' })
      .select('id, name, plan')
      .single();

    if (createErr) {
      console.warn('[auth] getOrCreateWorkspace create error:', createErr.message);
      return null;
    }

    if (newWs) {
      // Add user as admin member
      await getSupabase()!.from('workspace_members').insert({
        workspace_id: newWs.id,
        user_id: user.id,
        role: 'Admin',
      });

      // Create profile if not exists
      await getSupabase()!.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
      }, { onConflict: 'id' });

      return { id: newWs.id, name: newWs.name, plan: newWs.plan ?? 'free' };
    }

    return null;
  } catch (err) {
    console.warn('[auth] getOrCreateWorkspace failed:', err);
    return null;
  }
}
