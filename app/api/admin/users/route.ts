import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'conduit-admin-2026';

function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return unauthorized();
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const search = request.nextUrl.searchParams.get('search') || '';

    // Get all profiles
    let query = supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, created_at')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: profiles, error: profilesError } = await query.limit(200);
    if (profilesError) throw profilesError;

    // Get all workspaces with owner info
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id, name, owner_id, plan, credits_ai_calls, credits_ai_limit');

    // Get workspace members
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id, workspace_id, role');

    // Build user list with workspace info
    const users = (profiles || []).map(profile => {
      // Find workspaces owned by this user
      const ownedWorkspaces = (workspaces || []).filter(w => w.owner_id === profile.id);
      // Find workspaces where user is a member
      const memberWorkspaces = (members || [])
        .filter(m => m.user_id === profile.id)
        .map(m => (workspaces || []).find(w => w.id === m.workspace_id))
        .filter(Boolean);

      const primaryWorkspace = ownedWorkspaces[0] || memberWorkspaces[0] || null;

      return {
        ...profile,
        workspace: primaryWorkspace
          ? {
              id: primaryWorkspace.id,
              name: primaryWorkspace.name,
              plan: primaryWorkspace.plan,
              credits_ai_calls: primaryWorkspace.credits_ai_calls,
              credits_ai_limit: primaryWorkspace.credits_ai_limit,
            }
          : null,
        workspaceCount: ownedWorkspaces.length + memberWorkspaces.length,
      };
    });

    return Response.json({ users });
  } catch (err) {
    return Response.json(
      { error: 'Failed to fetch users', details: String(err) },
      { status: 500 }
    );
  }
}
