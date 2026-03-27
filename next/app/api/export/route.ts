import { createClient } from '@supabase/supabase-js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
    if (!token) {
      return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
    }

    const { data: workspace } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).single();
    if (!workspace) {
      return Response.json({ error: 'No workspace found' }, { status: 404, headers: corsHeaders });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const format = searchParams.get('format');
    const fmt = format || 'json';
    const exportData: Record<string, unknown[]> = {};

    if (type === 'content' || type === 'all') {
      const { data } = await supabase.from('content').select('*').eq('workspace_id', workspace.id);
      exportData.content = data || [];
    }
    if (type === 'keywords' || type === 'all') {
      const { data } = await supabase.from('keywords').select('*').eq('workspace_id', workspace.id);
      exportData.keywords = data || [];
    }
    if (type === 'pipeline' || type === 'all') {
      const { data } = await supabase.from('pipeline').select('*').eq('workspace_id', workspace.id);
      exportData.pipeline = data || [];
    }
    if (type === 'media' || type === 'all') {
      const { data } = await supabase.from('media').select('*').eq('workspace_id', workspace.id);
      exportData.media = data || [];
    }

    if (fmt === 'csv' && type && type !== 'all') {
      const items = (exportData[type] || []) as Record<string, unknown>[];
      if (items.length === 0) {
        return new Response('No data', { status: 200, headers: corsHeaders });
      }
      const headers = Object.keys(items[0]);
      const csv = headers.join(',') + '\n' + items.map((row) => {
        return headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return '"' + str + '"';
        }).join(',');
      }).join('\n');

      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="conduit-${type}-export.csv"`,
        },
      });
    }

    return Response.json(
      { exportedAt: new Date().toISOString(), workspace_id: workspace.id, ...exportData },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Disposition': 'attachment; filename="conduit-export.json"',
        },
      }
    );
  } catch (err) {
    console.error('Export error:', err);
    return Response.json({ error: 'Export failed' }, { status: 500, headers: corsHeaders });
  }
}
