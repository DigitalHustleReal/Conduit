'use client';

import { useState, useMemo, useCallback } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  batchRepurpose,
  ALL_FORMATS,
  FORMAT_LABELS,
  FORMAT_ICONS,
  FORMAT_PLATFORMS,
  PLATFORM_LIMITS,
  getDefaultRepurposeConfig,
  type RepurposeFormat,
  type RepurposedContent,
} from '@/lib/agents/repurposer';
import {
  scheduleRepurposedContent,
  getPostingStats,
  getUpcomingPosts,
} from '@/lib/agents/social-scheduler';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RepurposePage() {
  const {
    content,
    settings,
    repurposeConfig,
    repurposedContent,
    socialCalendar,
    brandVoiceProfile,
    deductCredit,
    setRepurposeConfig,
    addRepurposedContent,
    addScheduledPosts,
  } = useWorkspace();

  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<RepurposeFormat | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [autoRepurpose, setAutoRepurpose] = useState(repurposeConfig.autoQueue);

  // Published articles for selection
  const publishedArticles = useMemo(
    () => content.filter((c) => c.status === 'published').sort((a, b) => b.updated - a.updated),
    [content],
  );

  const selectedArticle = useMemo(
    () => content.find((c) => c.id === selectedArticleId) ?? null,
    [content, selectedArticleId],
  );

  // Current repurposed items for the selected article
  const currentRepurposed = useMemo(
    () =>
      repurposedContent.filter(
        (r) => (r.metadata.articleId as number) === selectedArticleId,
      ),
    [repurposedContent, selectedArticleId],
  );

  // Preview item
  const previewItem = useMemo(
    () => currentRepurposed.find((r) => r.format === previewFormat) ?? null,
    [currentRepurposed, previewFormat],
  );

  // Posting stats
  const stats = useMemo(() => getPostingStats(socialCalendar), [socialCalendar]);
  const upcoming = useMemo(() => getUpcomingPosts(socialCalendar, 5), [socialCalendar]);

  // Toggle format enabled/disabled
  const toggleFormat = useCallback(
    (format: RepurposeFormat) => {
      const current = repurposeConfig.enabledFormats;
      const next = current.includes(format)
        ? current.filter((f) => f !== format)
        : [...current, format];
      setRepurposeConfig({ enabledFormats: next });
    },
    [repurposeConfig.enabledFormats, setRepurposeConfig],
  );

  // Generate all enabled formats
  const handleGenerateAll = useCallback(async () => {
    if (!selectedArticle) {
      toast.error('Select an article first');
      return;
    }

    const formats = repurposeConfig.enabledFormats;
    if (formats.length === 0) {
      toast.error('Enable at least one format');
      return;
    }

    // Deduct 1-2 credits depending on format count
    const creditsNeeded = formats.length > 8 ? 2 : 1;
    for (let i = 0; i < creditsNeeded; i++) {
      if (!deductCredit()) {
        toast.error('Not enough AI credits');
        return;
      }
    }

    setGenerating(true);
    try {
      const config = {
        ...repurposeConfig,
        brandVoice: brandVoiceProfile,
      };
      const results = await batchRepurpose(
        selectedArticle,
        formats,
        config,
        settings as unknown as Record<string, string>,
      );

      if (results.length === 0) {
        toast.error('Failed to generate content. Check your AI settings.');
        return;
      }

      addRepurposedContent(results);

      // Auto-queue if enabled
      if (repurposeConfig.autoQueue) {
        const posts = scheduleRepurposedContent(
          results,
          socialCalendar,
          settings.defaultLocale === 'en' ? 'America/New_York' : 'UTC',
        );
        addScheduledPosts(posts);
        toast.success(`Generated ${results.length} pieces and queued ${posts.length} posts`);
      } else {
        toast.success(`Generated ${results.length} pieces of content`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [
    selectedArticle,
    repurposeConfig,
    brandVoiceProfile,
    settings,
    deductCredit,
    addRepurposedContent,
    addScheduledPosts,
    socialCalendar,
  ]);

  // Queue a single item for posting
  const handleQueueItem = useCallback(
    (item: RepurposedContent) => {
      const posts = scheduleRepurposedContent(
        [item],
        socialCalendar,
        settings.defaultLocale === 'en' ? 'America/New_York' : 'UTC',
      );
      addScheduledPosts(posts);
      toast.success(`Queued ${FORMAT_LABELS[item.format]} for posting`);
    },
    [socialCalendar, settings.defaultLocale, addScheduledPosts],
  );

  // Copy content to clipboard
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard'));
  }, []);

  // Get status for a format
  const getFormatStatus = useCallback(
    (format: RepurposeFormat): string => {
      if (generating && repurposeConfig.enabledFormats.includes(format)) return 'Generating...';
      const item = currentRepurposed.find((r) => r.format === format);
      if (!item) return 'Ready';
      if (item.status === 'queued') return 'Queued';
      if (item.status === 'posted') return 'Posted';
      return 'Draft';
    },
    [generating, repurposeConfig.enabledFormats, currentRepurposed],
  );

  // Repurpose history (grouped by article)
  const history = useMemo(() => {
    const grouped: Record<number, { title: string; count: number; date: number }> = {};
    for (const item of repurposedContent) {
      const aid = (item.metadata.articleId as number) || 0;
      if (!grouped[aid]) {
        grouped[aid] = {
          title: (item.metadata.articleTitle as string) || item.title,
          count: 0,
          date: (item.metadata.generatedAt as number) || 0,
        };
      }
      grouped[aid].count++;
    }
    return Object.entries(grouped)
      .map(([id, data]) => ({ id: Number(id), ...data }))
      .sort((a, b) => b.date - a.date);
  }, [repurposedContent]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content Repurposer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            One article becomes 10+ pieces of content across platforms
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {stats.scheduledThisWeek} scheduled this week
          </Badge>
          <Badge variant="outline" className="text-xs">
            {stats.postedThisWeek} posted this week
          </Badge>
        </div>
      </div>

      {/* Source Article Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Source Article
              </label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                value={selectedArticleId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedArticleId(val ? Number(val) : null);
                  setPreviewFormat(null);
                }}
              >
                <option value="">Select a published article...</option>
                {publishedArticles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.wordCount} words)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Auto-repurpose new publishes</label>
              <button
                type="button"
                role="switch"
                aria-checked={autoRepurpose}
                onClick={() => {
                  setAutoRepurpose(!autoRepurpose);
                  setRepurposeConfig({ autoQueue: !autoRepurpose });
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  autoRepurpose ? 'bg-blue-500' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                    autoRepurpose ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <Button
              onClick={handleGenerateAll}
              disabled={!selectedArticle || generating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {generating ? 'Generating...' : `Generate All (${repurposeConfig.enabledFormats.length > 8 ? 2 : 1} credit${repurposeConfig.enabledFormats.length > 8 ? 's' : ''})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Format Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Formats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {ALL_FORMATS.map((format) => {
              const enabled = repurposeConfig.enabledFormats.includes(format);
              const limit = PLATFORM_LIMITS[format];
              const status = getFormatStatus(format);
              const hasContent = currentRepurposed.some((r) => r.format === format);

              return (
                <Card
                  key={format}
                  className={`cursor-pointer transition-all duration-200 ${
                    enabled
                      ? 'border-blue-500/30 bg-blue-500/5'
                      : 'border-border opacity-60'
                  } ${
                    previewFormat === format ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => {
                    if (hasContent) {
                      setPreviewFormat(format);
                      const item = currentRepurposed.find((r) => r.format === format);
                      if (item) setEditingContent(item.content);
                    }
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{FORMAT_ICONS[format]}</span>
                        <div>
                          <div className="text-xs font-semibold text-foreground">
                            {FORMAT_LABELS[format]}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {FORMAT_PLATFORMS[format]}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFormat(format);
                        }}
                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          enabled ? 'bg-blue-500' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
                            enabled ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{limit.maxChars.toLocaleString()} chars max</span>
                      <span>{limit.bestTime}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          status === 'Generating...'
                            ? 'border-amber-500/50 text-amber-500'
                            : status === 'Queued'
                              ? 'border-blue-500/50 text-blue-500'
                              : status === 'Posted'
                                ? 'border-emerald-500/50 text-emerald-500'
                                : status === 'Draft'
                                  ? 'border-violet-500/50 text-violet-500'
                                  : 'border-border text-muted-foreground'
                        }`}
                      >
                        {status}
                      </Badge>
                      {limit.maxHashtags > 0 && (
                        <span className="text-[9px] text-muted-foreground">
                          {limit.maxHashtags} hashtags
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Preview</h2>

          {previewItem ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{FORMAT_ICONS[previewItem.format]}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {FORMAT_LABELS[previewItem.format]}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px]">
                    {previewItem.status}
                  </Badge>
                </div>

                {/* Character counter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Characters</span>
                    <span>
                      {editingContent.length} / {PLATFORM_LIMITS[previewItem.format]?.maxChars || 0}
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        editingContent.length >
                        (PLATFORM_LIMITS[previewItem.format]?.maxChars || Infinity)
                          ? 'bg-rose-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          (editingContent.length /
                            (PLATFORM_LIMITS[previewItem.format]?.maxChars || 1)) *
                            100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Content editor */}
                <textarea
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground resize-y min-h-[200px] font-mono"
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={10}
                />

                {/* Hashtags */}
                {previewItem.hashtags && previewItem.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {previewItem.hashtags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleCopy(editingContent)}
                  >
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleQueueItem(previewItem)}
                  >
                    Queue for Auto-Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-3xl mb-2">{'\u267B'}</div>
                <p className="text-sm text-muted-foreground">
                  {selectedArticle
                    ? 'Generate content, then click a format card to preview'
                    : 'Select an article to start repurposing'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Posts */}
          {upcoming.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="text-xs font-semibold text-foreground">Upcoming Posts</h3>
                {upcoming.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span>{FORMAT_ICONS[post.platform]}</span>
                      <span className="text-foreground truncate max-w-[120px]">
                        {post.articleTitle}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(post.scheduledTime).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Repurpose History */}
      {history.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Repurpose History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Article</th>
                    <th className="pb-2 pr-4">Formats Generated</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 20).map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedArticleId(entry.id);
                        setPreviewFormat(null);
                      }}
                    >
                      <td className="py-2 pr-4 text-foreground font-medium truncate max-w-[300px]">
                        {entry.title}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-[10px]">
                          {entry.count} formats
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground text-xs">
                        {entry.date > 0
                          ? new Date(entry.date).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
