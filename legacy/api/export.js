const { createClient } = require('@supabase/supabase-js');

/**
 * Data Export API — /api/export
 * GET /api/export?type=content&format=json    → export all content as JSON
 * GET /api/export?type=content&format=csv     → export as CSV
 * GET /api/export?type=keywords&format=json   → export keywords
 * GET /api/export?type=all&format=json        → export everything
 * Requires auth (JWT in Authorization header)
 */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authorization required' });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: workspace } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).single();
    if (!workspace) return res.status(404).json({ error: 'No workspace found' });

    const { type, format } = req.query;
    const fmt = format || 'json';
    var exportData = {};

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

    if (fmt === 'csv' && type !== 'all') {
      var items = exportData[type] || [];
      if (items.length === 0) return res.status(200).send('No data');
      var headers = Object.keys(items[0]);
      var csv = headers.join(',') + '\n' + items.map(function(row) {
        return headers.map(function(h) {
          var val = row[h];
          if (val === null || val === undefined) return '';
          val = String(val).replace(/"/g, '""');
          return '"' + val + '"';
        }).join(',');
      }).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="conduit-' + type + '-export.csv"');
      return res.status(200).send(csv);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="conduit-export.json"');
    return res.status(200).json({ exportedAt: new Date().toISOString(), workspace_id: workspace.id, ...exportData });
  } catch (err) {
    console.error('Export error:', err);
    return res.status(500).json({ error: 'Export failed' });
  }
};
