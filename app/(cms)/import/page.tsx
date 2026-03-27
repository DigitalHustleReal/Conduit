'use client';

import { useState, useCallback, useRef } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  importFromNotion,
  importFromSheets,
  importFromCSV,
  importFromJSON,
  detectCSVHeaders,
  detectJSONKeys,
  getCSVPreviewRows,
  getJSONPreviewRows,
  mapImportedToContent,
  CONDUIT_FIELDS,
  type ImportHistoryEntry,
  type ImportSource,
  type ImportMapping,
} from '@/lib/import';
import type { ContentItem } from '@/types/content';

type Tab = 'notion' | 'sheets' | 'csv' | 'json';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'notion', label: 'Notion', icon: 'N' },
  { id: 'sheets', label: 'Google Sheets', icon: 'S' },
  { id: 'csv', label: 'CSV', icon: 'C' },
  { id: 'json', label: 'JSON', icon: 'J' },
];

export default function ImportPage() {
  const { addContent, settings } = useWorkspace();
  const [activeTab, setActiveTab] = useState<Tab>('notion');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const addToHistory = useCallback((source: ImportSource, count: number, label?: string) => {
    setHistory((prev) => [
      { id: Date.now(), source, count, date: Date.now(), label },
      ...prev,
    ].slice(0, 5));
  }, []);

  const importItems = useCallback((items: ContentItem[], source: ImportSource, label?: string) => {
    for (const item of items) {
      addContent(item);
    }
    addToHistory(source, items.length, label);
    showToast(`Successfully imported ${items.length} item${items.length !== 1 ? 's' : ''} from ${source}`, 'success');
  }, [addContent, addToHistory, showToast]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Content</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import content from Notion, Google Sheets, CSV, or JSON into your workspace.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-lg text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="w-5 h-5 rounded bg-blue-500/10 text-blue-400 text-xs font-bold flex items-center justify-center">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Card>
        <CardContent className="pt-2">
          {activeTab === 'notion' && (
            <NotionTab
              loading={loading}
              setLoading={setLoading}
              onImport={importItems}
              onError={(msg) => showToast(msg, 'error')}
              notionToken={(settings.integrations?.notion_token as string) || ''}
            />
          )}
          {activeTab === 'sheets' && (
            <SheetsTab
              loading={loading}
              setLoading={setLoading}
              onImport={importItems}
              onError={(msg) => showToast(msg, 'error')}
              googleToken={settings.gscRefreshToken}
            />
          )}
          {activeTab === 'csv' && (
            <CSVTab
              loading={loading}
              setLoading={setLoading}
              onImport={importItems}
              onError={(msg) => showToast(msg, 'error')}
            />
          )}
          {activeTab === 'json' && (
            <JSONTab
              loading={loading}
              setLoading={setLoading}
              onImport={importItems}
              onError={(msg) => showToast(msg, 'error')}
            />
          )}
        </CardContent>
      </Card>

      {/* Import History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Imports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {entry.source}
                    </Badge>
                    <span className="text-foreground">{entry.count} items</span>
                    {entry.label && <span className="text-muted-foreground">({entry.label})</span>}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(entry.date).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notion Tab
// ---------------------------------------------------------------------------

function NotionTab({
  loading,
  setLoading,
  onImport,
  onError,
  notionToken,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
  onImport: (items: ContentItem[], source: ImportSource, label?: string) => void;
  onError: (msg: string) => void;
  notionToken: string;
}) {
  const [databaseId, setDatabaseId] = useState('');
  const [token, setToken] = useState(notionToken);
  const [preview, setPreview] = useState<ContentItem[]>([]);

  const handleFetchPreview = useCallback(async () => {
    if (!databaseId.trim()) { onError('Enter a Notion database ID'); return; }
    setLoading(true);
    const result = await importFromNotion(databaseId.trim(), token || undefined, true);
    setLoading(false);
    if (result.error) { onError(result.error); return; }
    setPreview(result.items);
  }, [databaseId, token, setLoading, onError]);

  const handleImport = useCallback(async () => {
    if (!databaseId.trim()) { onError('Enter a Notion database ID'); return; }
    setLoading(true);
    const result = await importFromNotion(databaseId.trim(), token || undefined);
    setLoading(false);
    if (result.error) { onError(result.error); return; }
    onImport(result.items, 'notion', `DB: ${databaseId.slice(0, 8)}...`);
    setPreview([]);
  }, [databaseId, token, setLoading, onError, onImport]);

  return (
    <div className="space-y-4">
      {!notionToken && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
          <p className="text-amber-400 font-medium">Notion not connected</p>
          <p className="text-muted-foreground mt-1">
            Connect via OAuth or paste an integration token below.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => { window.location.href = '/api/import/notion/auth'; }}
          >
            Connect Notion
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Database ID
          <span className="text-muted-foreground font-normal ml-1">(from Notion database URL)</span>
        </label>
        <Input
          placeholder="e.g. abc123def456..."
          value={databaseId}
          onChange={(e) => setDatabaseId(e.target.value)}
        />
      </div>

      {!notionToken && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Integration Token
            <span className="text-muted-foreground font-normal ml-1">(optional if connected via OAuth)</span>
          </label>
          <Input
            placeholder="ntn_..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            type="password"
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleFetchPreview} disabled={loading}>
          {loading ? 'Fetching...' : 'Fetch Preview'}
        </Button>
        <Button onClick={handleImport} disabled={loading || !databaseId.trim()}>
          {loading ? 'Importing...' : 'Import All'}
        </Button>
      </div>

      {preview.length > 0 && <PreviewTable items={preview} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Google Sheets Tab
// ---------------------------------------------------------------------------

function SheetsTab({
  loading,
  setLoading,
  onImport,
  onError,
  googleToken,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
  onImport: (items: ContentItem[], source: ImportSource, label?: string) => void;
  onError: (msg: string) => void;
  googleToken?: string;
}) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [range, setRange] = useState('Sheet1!A1:F100');
  const [mapping, setMapping] = useState<ImportMapping>({ A: 'title', B: 'keyword', C: 'status', D: 'body' });
  const [preview, setPreview] = useState<ContentItem[]>([]);

  const extractSpreadsheetId = useCallback((input: string): string => {
    // Support full URLs: https://docs.google.com/spreadsheets/d/{ID}/edit
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : input.trim();
  }, []);

  const handleFetchPreview = useCallback(async () => {
    const id = extractSpreadsheetId(spreadsheetId);
    if (!id) { onError('Enter a spreadsheet ID or URL'); return; }
    setLoading(true);
    const result = await importFromSheets(id, range, mapping, googleToken, true);
    setLoading(false);
    if (result.error) { onError(result.error); return; }
    setPreview(result.items);
  }, [spreadsheetId, range, mapping, googleToken, extractSpreadsheetId, setLoading, onError]);

  const handleImport = useCallback(async () => {
    const id = extractSpreadsheetId(spreadsheetId);
    if (!id) { onError('Enter a spreadsheet ID or URL'); return; }
    setLoading(true);
    const result = await importFromSheets(id, range, mapping, googleToken);
    setLoading(false);
    if (result.error) { onError(result.error); return; }
    onImport(result.items, 'sheets', `Sheet: ${id.slice(0, 8)}...`);
    setPreview([]);
  }, [spreadsheetId, range, mapping, googleToken, extractSpreadsheetId, setLoading, onError, onImport]);

  const updateMapping = useCallback((col: string, field: string) => {
    setMapping((prev) => ({ ...prev, [col]: field }));
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Spreadsheet URL or ID</label>
        <Input
          placeholder="https://docs.google.com/spreadsheets/d/... or ID"
          value={spreadsheetId}
          onChange={(e) => setSpreadsheetId(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Range</label>
        <Input
          placeholder="Sheet1!A1:F100"
          value={range}
          onChange={(e) => setRange(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Column Mapping</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {['A', 'B', 'C', 'D', 'E', 'F'].map((col) => (
            <div key={col} className="space-y-1">
              <span className="text-xs text-muted-foreground font-mono">Column {col}</span>
              <select
                className="w-full h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                value={mapping[col] || ''}
                onChange={(e) => updateMapping(col, e.target.value)}
              >
                <option value="">-- Skip --</option>
                {CONDUIT_FIELDS.filter((f) => f.value).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleFetchPreview} disabled={loading}>
          {loading ? 'Fetching...' : 'Fetch Preview'}
        </Button>
        <Button onClick={handleImport} disabled={loading || !spreadsheetId.trim()}>
          {loading ? 'Importing...' : 'Import All'}
        </Button>
      </div>

      {preview.length > 0 && <PreviewTable items={preview} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV Tab
// ---------------------------------------------------------------------------

function CSVTab({
  loading,
  setLoading,
  onImport,
  onError,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
  onImport: (items: ContentItem[], source: ImportSource, label?: string) => void;
  onError: (msg: string) => void;
}) {
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processCSV = useCallback((text: string) => {
    setCsvText(text);
    const detected = detectCSVHeaders(text);
    setHeaders(detected);
    setPreviewRows(getCSVPreviewRows(text));
    // Auto-map by guessing
    const autoMapping: ImportMapping = {};
    for (const h of detected) {
      const lower = h.toLowerCase();
      if (lower.includes('title') || lower === 'name') autoMapping[h] = 'title';
      else if (lower.includes('body') || lower.includes('content') || lower === 'text') autoMapping[h] = 'body';
      else if (lower.includes('keyword')) autoMapping[h] = 'keyword';
      else if (lower.includes('status')) autoMapping[h] = 'status';
      else if (lower.includes('tag')) autoMapping[h] = 'tags';
      else if (lower.includes('slug')) autoMapping[h] = 'slug';
      else if (lower.includes('meta') && lower.includes('title')) autoMapping[h] = 'metaTitle';
      else if (lower.includes('meta') && lower.includes('desc')) autoMapping[h] = 'metaDescription';
      else if (lower.includes('excerpt') || lower.includes('summary')) autoMapping[h] = 'excerpt';
    }
    setMapping(autoMapping);
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) processCSV(text);
    };
    reader.readAsText(file);
  }, [processCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = useCallback(() => {
    if (!csvText.trim()) { onError('Paste CSV content or upload a file.'); return; }
    setLoading(true);

    // If mapping is configured, use mapImportedToContent; else use auto-detection
    const rows = getCSVPreviewRows(csvText, 99999);
    let items: ContentItem[];
    if (Object.keys(mapping).length > 0 && Object.values(mapping).some(Boolean)) {
      items = mapImportedToContent(rows, mapping, 'csv');
    } else {
      const result = importFromCSV(csvText);
      if (result.error) { onError(result.error); setLoading(false); return; }
      items = result.items;
    }

    setLoading(false);
    onImport(items, 'csv', `${items.length} rows`);
    setCsvText('');
    setHeaders([]);
    setPreviewRows([]);
  }, [csvText, mapping, setLoading, onError, onImport]);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-500/5' : 'border-border'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <p className="text-sm text-muted-foreground">
          Drag and drop a CSV file here, or{' '}
          <button
            className="text-blue-400 underline"
            onClick={() => fileRef.current?.click()}
          >
            browse
          </button>
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {/* Or paste */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Or paste CSV content</label>
        <textarea
          className="w-full h-32 rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-mono resize-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          placeholder="title,keyword,status,body&#10;My Article,seo tips,draft,Article content here..."
          value={csvText}
          onChange={(e) => processCSV(e.target.value)}
        />
      </div>

      {/* Column mapping */}
      {headers.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Column Mapping</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {headers.map((h) => (
              <div key={h} className="space-y-1">
                <span className="text-xs text-muted-foreground font-mono">{h}</span>
                <select
                  className="w-full h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                  value={mapping[h] || ''}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value }))}
                >
                  <option value="">-- Skip --</option>
                  {CONDUIT_FIELDS.filter((f) => f.value).map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {previewRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Preview (first {previewRows.length} rows)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-border rounded-lg">
              <thead>
                <tr className="bg-muted/50">
                  {headers.map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium border-b border-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    {headers.map((h) => (
                      <td key={h} className="px-2 py-1.5 max-w-[200px] truncate">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Button onClick={handleImport} disabled={loading || !csvText.trim()}>
        {loading ? 'Importing...' : `Import${previewRows.length > 0 ? ` ${previewRows.length} items` : ''}`}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// JSON Tab
// ---------------------------------------------------------------------------

function JSONTab({
  loading,
  setLoading,
  onImport,
  onError,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
  onImport: (items: ContentItem[], source: ImportSource, label?: string) => void;
  onError: (msg: string) => void;
}) {
  const [jsonText, setJsonText] = useState('');
  const [keys, setKeys] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);

  const processJSON = useCallback((text: string) => {
    setJsonText(text);
    const detected = detectJSONKeys(text);
    setKeys(detected);
    setPreviewRows(getJSONPreviewRows(text));
    // Auto-map
    const autoMapping: ImportMapping = {};
    for (const k of detected) {
      const lower = k.toLowerCase();
      if (lower === 'title' || lower === 'name') autoMapping[k] = 'title';
      else if (lower === 'body' || lower === 'content' || lower === 'text') autoMapping[k] = 'body';
      else if (lower.includes('keyword')) autoMapping[k] = 'keyword';
      else if (lower === 'status') autoMapping[k] = 'status';
      else if (lower === 'tags') autoMapping[k] = 'tags';
      else if (lower === 'slug') autoMapping[k] = 'slug';
    }
    setMapping(autoMapping);
  }, []);

  const handleImport = useCallback(() => {
    if (!jsonText.trim()) { onError('Paste JSON content.'); return; }
    setLoading(true);

    const rows = getJSONPreviewRows(jsonText, 99999);
    let items: ContentItem[];
    if (Object.keys(mapping).length > 0 && Object.values(mapping).some(Boolean)) {
      items = mapImportedToContent(rows, mapping, 'json');
    } else {
      const result = importFromJSON(jsonText);
      if (result.error) { onError(result.error); setLoading(false); return; }
      items = result.items;
    }

    setLoading(false);
    onImport(items, 'json', `${items.length} items`);
    setJsonText('');
    setKeys([]);
    setPreviewRows([]);
  }, [jsonText, mapping, setLoading, onError, onImport]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Paste JSON Array</label>
        <textarea
          className="w-full h-40 rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-mono resize-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          placeholder={'[\n  { "title": "My Article", "body": "Content here...", "status": "draft" }\n]'}
          value={jsonText}
          onChange={(e) => processJSON(e.target.value)}
        />
      </div>

      {/* Key mapping */}
      {keys.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Field Mapping</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {keys.map((k) => (
              <div key={k} className="space-y-1">
                <span className="text-xs text-muted-foreground font-mono">{k}</span>
                <select
                  className="w-full h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                  value={mapping[k] || ''}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [k]: e.target.value }))}
                >
                  <option value="">-- Skip --</option>
                  {CONDUIT_FIELDS.filter((f) => f.value).map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {previewRows.length > 0 && keys.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Preview (first {previewRows.length} entries)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-border rounded-lg">
              <thead>
                <tr className="bg-muted/50">
                  {keys.map((k) => (
                    <th key={k} className="px-2 py-1.5 text-left font-medium border-b border-border">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    {keys.map((k) => (
                      <td key={k} className="px-2 py-1.5 max-w-[200px] truncate">{row[k]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Button onClick={handleImport} disabled={loading || !jsonText.trim()}>
        {loading ? 'Importing...' : `Import${previewRows.length > 0 ? ` ${previewRows.length} items` : ''}`}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared Preview Table
// ---------------------------------------------------------------------------

function PreviewTable({ items }: { items: ContentItem[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Preview ({items.length} items)</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-border rounded-lg">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-2 py-1.5 text-left font-medium border-b border-border">Title</th>
              <th className="px-2 py-1.5 text-left font-medium border-b border-border">Status</th>
              <th className="px-2 py-1.5 text-left font-medium border-b border-border">Tags</th>
              <th className="px-2 py-1.5 text-left font-medium border-b border-border">Words</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/50 last:border-0">
                <td className="px-2 py-1.5 max-w-[250px] truncate font-medium">{item.title}</td>
                <td className="px-2 py-1.5">
                  <Badge variant="secondary" className="text-[10px]">{item.status}</Badge>
                </td>
                <td className="px-2 py-1.5 max-w-[150px] truncate">{item.tags?.join(', ')}</td>
                <td className="px-2 py-1.5 font-mono">{item.wordCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
