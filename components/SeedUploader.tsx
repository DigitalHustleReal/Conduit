'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  parseSeedData,
  detectFormat,
  mergeSeedsIntoState,
  generateCSVTemplate,
} from '@/lib/autopilot/seed';
import type { SeedData, SeedKeyword } from '@/lib/autopilot/seed';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeedUploaderProps {
  /** Called when the user confirms the import. */
  onImport: (seeds: SeedData) => void;
  /** Existing keyword strings for dedup display. */
  existingKeywords?: string[];
  /** Compact mode (less padding, no template links). Used in onboarding. */
  compact?: boolean;
  /** Optional class name override. */
  className?: string;
}

type Tab = 'upload' | 'paste' | 'quick';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function intentBadgeVariant(intent?: string): 'default' | 'secondary' | 'outline' {
  if (!intent) return 'outline';
  const low = intent.toLowerCase();
  if (low === 'transactional' || low === 'commercial') return 'default';
  if (low === 'informational') return 'secondary';
  return 'outline';
}

function downloadTemplate(format: 'ahrefs' | 'semrush' | 'simple') {
  const csv = generateCSVTemplate(format);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seed-template-${format}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SeedUploader({
  onImport,
  existingKeywords = [],
  compact = false,
  className = '',
}: SeedUploaderProps) {
  const [activeTab, setActiveTab] = useState<Tab>('paste');
  const [rawText, setRawText] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [parsedData, setParsedData] = useState<SeedData | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merge result for preview
  const mergeResult = useMemo(() => {
    if (!parsedData) return null;
    return mergeSeedsIntoState(parsedData, existingKeywords);
  }, [parsedData, existingKeywords]);

  const totalCount = parsedData
    ? parsedData.keywords.length + parsedData.titles.length
    : 0;

  // ── Parse input ──────────────────────────────────────────────
  const parseInput = useCallback((text: string) => {
    if (!text.trim()) {
      setParsedData(null);
      setDetectedFormat('');
      return;
    }
    const fmt = detectFormat(text);
    setDetectedFormat(fmt === 'csv' ? 'CSV' : fmt === 'json' ? 'JSON' : 'Plain text');
    const data = parseSeedData(text, fmt);
    setParsedData(data);
  }, []);

  // ── File reading ─────────────────────────────────────────────
  const readFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setRawText(text);
        setActiveTab('paste');
        parseInput(text);
      };
      reader.readAsText(file);
    },
    [parseInput],
  );

  // ── Drag & drop ──────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) readFile(file);
    },
    [readFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) readFile(file);
    },
    [readFile],
  );

  // ── Quick add ────────────────────────────────────────────────
  const handleQuickAdd = useCallback(() => {
    const kw = quickInput.trim();
    if (!kw) return;
    setParsedData((prev) => {
      const existing = prev ?? { keywords: [], titles: [], topics: [], briefs: [] };
      return {
        ...existing,
        keywords: [
          ...existing.keywords,
          { keyword: kw, source: 'manual' } as SeedKeyword,
        ],
      };
    });
    setQuickInput('');
  }, [quickInput]);

  // ── Remove keyword ───────────────────────────────────────────
  const handleRemoveKeyword = useCallback((index: number) => {
    setParsedData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        keywords: prev.keywords.filter((_, i) => i !== index),
      };
    });
  }, []);

  // ── Import ───────────────────────────────────────────────────
  const handleImport = useCallback(() => {
    if (parsedData) {
      onImport(parsedData);
      setParsedData(null);
      setRawText('');
      setDetectedFormat('');
    }
  }, [parsedData, onImport]);

  // ── Render ───────────────────────────────────────────────────
  const wrapperPadding = compact ? 'p-0' : '';

  return (
    <div className={`${wrapperPadding} ${className}`}>
      {!compact && (
        <Card className="bg-card/80 backdrop-blur border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Seed Data Upload
              {detectedFormat && (
                <Badge variant="secondary" className="text-[10px]">
                  {detectedFormat} detected
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Import keywords from Ahrefs, SEMrush, Google Keyword Planner, or any spreadsheet
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderTabs()}
            {renderActivePane()}
            {renderPreview()}
            {renderTemplates()}
          </CardContent>
        </Card>
      )}

      {compact && (
        <div className="space-y-3">
          {detectedFormat && (
            <Badge variant="secondary" className="text-[10px]">
              {detectedFormat} detected
            </Badge>
          )}
          {renderTabs()}
          {renderActivePane()}
          {renderPreview()}
        </div>
      )}
    </div>
  );

  // ── Tab bar ──────────────────────────────────────────────────
  function renderTabs() {
    const tabs: { id: Tab; label: string }[] = [
      { id: 'paste', label: 'Paste' },
      { id: 'upload', label: 'Upload File' },
      { id: 'quick', label: 'Quick Add' },
    ];
    return (
      <div className="flex gap-1 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === t.id
                ? 'bg-blue-500/15 text-blue-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  // ── Active pane ──────────────────────────────────────────────
  function renderActivePane() {
    switch (activeTab) {
      case 'paste':
        return (
          <div className="space-y-2">
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                parseInput(e.target.value);
              }}
              placeholder="Paste keywords (one per line), CSV data, or JSON array..."
              rows={compact ? 4 : 6}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 resize-y font-mono"
            />
          </div>
        );

      case 'upload':
        return (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors py-8 px-4 cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-border hover:border-blue-500/40 hover:bg-muted/30'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg
              className="h-8 w-8 text-muted-foreground mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm text-muted-foreground">
              Drop a CSV, JSON, or TXT file here
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              or click to browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.txt,.tsv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        );

      case 'quick':
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAdd();
                  }
                }}
                placeholder="Type a keyword and press Enter"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleQuickAdd}
                disabled={!quickInput.trim()}
                className="border-border hover:border-blue-500/50"
              >
                Add
              </Button>
            </div>
            {parsedData && parsedData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {parsedData.keywords.map((kw, i) => (
                  <Badge key={`${kw.keyword}-${i}`} variant="secondary" className="text-xs gap-1.5 pr-1">
                    {kw.keyword}
                    <button
                      onClick={() => handleRemoveKeyword(i)}
                      className="ml-0.5 text-muted-foreground hover:text-foreground"
                    >
                      x
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );
    }
  }

  // ── Preview table ────────────────────────────────────────────
  function renderPreview() {
    if (!parsedData || parsedData.keywords.length === 0) return null;

    const hasVolume = parsedData.keywords.some((k) => k.volume !== undefined);
    const hasDifficulty = parsedData.keywords.some((k) => k.difficulty !== undefined);
    const hasIntent = parsedData.keywords.some((k) => !!k.intent);
    const displayKeywords = parsedData.keywords.slice(0, 50);

    return (
      <div className="space-y-2 mt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{totalCount}</span> keyword{totalCount !== 1 ? 's' : ''} ready to import
            {mergeResult && mergeResult.duplicatesSkipped > 0 && (
              <span className="text-amber-400 ml-2">
                ({mergeResult.duplicatesSkipped} duplicate{mergeResult.duplicatesSkipped !== 1 ? 's' : ''} will be skipped)
              </span>
            )}
          </p>
        </div>

        <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-2">Keyword</th>
                {hasVolume && <th className="px-3 py-2">Volume</th>}
                {hasDifficulty && <th className="px-3 py-2">Difficulty</th>}
                {hasIntent && <th className="px-3 py-2">Intent</th>}
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {displayKeywords.map((kw, i) => (
                <tr key={`${kw.keyword}-${i}`} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-medium text-foreground">{kw.keyword}</td>
                  {hasVolume && (
                    <td className="px-3 py-1.5 font-mono text-muted-foreground">
                      {kw.volume?.toLocaleString() ?? '-'}
                    </td>
                  )}
                  {hasDifficulty && (
                    <td className="px-3 py-1.5 font-mono text-muted-foreground">
                      {kw.difficulty ?? '-'}
                    </td>
                  )}
                  {hasIntent && (
                    <td className="px-3 py-1.5">
                      {kw.intent ? (
                        <Badge variant={intentBadgeVariant(kw.intent)} className="text-[9px]">
                          {kw.intent}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                  )}
                  <td className="px-3 py-1.5">
                    <Badge variant="outline" className="text-[9px]">{kw.source}</Badge>
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => handleRemoveKeyword(i)}
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsedData.keywords.length > 50 && (
            <div className="text-center py-2 text-[10px] text-muted-foreground">
              ...and {parsedData.keywords.length - 50} more
            </div>
          )}
        </div>

        <Button
          onClick={handleImport}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white"
          disabled={!parsedData || parsedData.keywords.length === 0}
        >
          Add to Autopilot ({mergeResult?.newKeywords.length ?? parsedData.keywords.length} keywords)
        </Button>
      </div>
    );
  }

  // ── Template downloads ───────────────────────────────────────
  function renderTemplates() {
    if (compact) return null;
    return (
      <div className="flex items-center gap-3 pt-2 text-[10px] text-muted-foreground">
        <span>Download template:</span>
        <button
          onClick={() => downloadTemplate('ahrefs')}
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Ahrefs format
        </button>
        <span>|</span>
        <button
          onClick={() => downloadTemplate('semrush')}
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          SEMrush format
        </button>
        <span>|</span>
        <button
          onClick={() => downloadTemplate('simple')}
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Simple list
        </button>
      </div>
    );
  }
}
