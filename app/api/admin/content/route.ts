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
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id, title, workspace_id, status, seo_score, ai_score, word_count, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (contentError) throw contentError;

    return Response.json({ content: content || [] });
  } catch (err) {
    return Response.json(
      { error: 'Failed to fetch content', details: String(err) },
      { status: 500 }
    );
  }
}
