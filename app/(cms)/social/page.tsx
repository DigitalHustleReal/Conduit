'use client';

import { useState, useMemo } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  generateSocialPosts,
  schedulePost,
  getConnectedAccounts,
  postToSocial,
  PLATFORM_LIMITS,
  type SocialPost,
  type SocialPlatform,
} from '@/lib/social';

// ---------------------------------------------------------------------------
// Local state for social post queue (persisted in component for now)
// ---------------------------------------------------------------------------

const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  twitter: 'X',
  linkedin: 'in',
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  twitter: 'Twitter / X',
  linkedin: 'LinkedIn',
};

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-amber-500/20 text-amber-400',
  posted: 'bg-emerald-500/20 text-emerald-400',
  failed: 'bg-red-500/20 text-red-400',
};

export default function SocialPage() {
  const { content, settings } = useWorkspace();
  const accounts = useMemo(() => getConnectedAccounts(settings), [settings]);

  const [queue, setQueue] = useState<SocialPost[]>([]);
  const [platform, setPlatform] = useState<SocialPlatform>('twitter');
  const [postText, setPostText] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [posting, setPosting] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<'compose' | 'queue' | 'history'>('compose');

  const charLimit = PLATFORM_LIMITS[platform];
  const charCount = postText.length;
  const overLimit = charCount > charLimit;

  const publishedArticles = content.filter((c) => c.status === 'published' || c.status === 'draft');

  // ---- Auto-generate from article ----------------------------------------
  function handleGenerateFromArticle() {
    if (!selectedArticleId) return;
    const article = content.find((c) => c.id === selectedArticleId);
    if (!article) return;

    setGenerating(true);
    try {
      const siteDomain = settings.siteDomain || '';
      const posts = generateSocialPosts(article, siteDomain ? `https://${siteDomain}` : '');
      setPostText(posts[platform]);
    } finally {
      setGenerating(false);
    }
  }

  // ---- Add to queue -------------------------------------------------------
  function handleAddToQueue() {
    if (!postText.trim() || overLimit) return;
    const article = selectedArticleId ? content.find((c) => c.id === selectedArticleId) : null;
    const siteDomain = settings.siteDomain || '';
    const articleUrl = article?.slug && siteDomain
      ? `https://${siteDomain.replace(/\/$/, '')}/${article.slug}`
      : undefined;

    const post = schedulePost(platform, postText, undefined, selectedArticleId || undefined, articleUrl);
    setQueue((prev) => [post, ...prev]);
    setPostText('');
    setSelectedArticleId(null);
  }

  // ---- Post immediately ---------------------------------------------------
  async function handlePostNow(post: SocialPost) {
    setPosting(post.id);
    try {
      const result = await postToSocial(post);
      setQueue((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, status: 'posted' as const, postedAt: Date.now(), externalId: result.id, externalUrl: result.url }
            : p
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setQueue((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, status: 'failed' as const, error: msg } : p
        )
      );
    } finally {
      setPosting(null);
    }
  }

  // ---- Remove from queue --------------------------------------------------
  function handleRemove(id: string) {
    setQueue((prev) => prev.filter((p) => p.id !== id));
  }

  const queuedPosts = queue.filter((p) => p.status === 'queued');
  const historyPosts = queue.filter((p) => p.status !== 'queued');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Distribution</p>
        <h1 className="text-2xl font-bold">Social Media</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create, schedule, and publish social posts across your connected platforms
        </p>
      </div>

      {/* Connected Accounts */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {accounts.map((acc) => (
          <Card key={acc.platform} className={`bg-card ${acc.connected ? 'border-emerald-500/30' : ''}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-sm">
                  {acc.icon}
                </div>
                <div>
                  <div className="font-semibold text-sm">{acc.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {acc.connected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>
              {acc.connected ? (
                <Badge variant="default" className="text-[9px]">Active</Badge>
              ) : (
                <a href={`/api/social/auth/${acc.platform}`}>
                  <Button size="sm" variant="outline">Connect {acc.label}</Button>
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {(['compose', 'queue', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold capitalize transition-colors border-b-2 ${
              tab === t
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t} {t === 'queue' && queuedPosts.length > 0 ? `(${queuedPosts.length})` : ''}
          </button>
        ))}
      </div>

      {/* Compose Tab */}
      {tab === 'compose' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Post Form */}
          <Card className="bg-card">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm">Create Post</h3>

              {/* Platform selector */}
              <div className="flex gap-2">
                {(['twitter', 'linkedin'] as SocialPlatform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      platform === p
                        ? 'bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/40'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold">
                      {PLATFORM_ICONS[p]}
                    </span>
                    {PLATFORM_LABELS[p]}
                  </button>
                ))}
              </div>

              {/* Article selector */}
              <div>
                <label className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block mb-1.5">
                  Source Article (optional)
                </label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  value={selectedArticleId || ''}
                  onChange={(e) => setSelectedArticleId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Select an article...</option>
                  {publishedArticles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.status})
                    </option>
                  ))}
                </select>
                {selectedArticleId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs"
                    onClick={handleGenerateFromArticle}
                    disabled={generating}
                  >
                    {generating ? 'Generating...' : 'Auto-generate from article'}
                  </Button>
                )}
              </div>

              {/* Post text */}
              <div>
                <label className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block mb-1.5">
                  Post Text
                </label>
                <textarea
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs min-h-[120px] resize-y focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder={`Write your ${PLATFORM_LABELS[platform]} post...`}
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  maxLength={charLimit + 100}
                />
                <div className={`text-right text-[10px] mt-1 ${overLimit ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {charCount} / {charLimit}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddToQueue}
                  disabled={!postText.trim() || overLimit}
                  className="flex-1"
                >
                  Add to Queue
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const post = schedulePost(platform, postText, undefined, selectedArticleId || undefined);
                    handlePostNow(post);
                  }}
                  disabled={!postText.trim() || overLimit || posting !== null}
                  className="flex-1"
                >
                  Post Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-card">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">Preview</h3>

              {platform === 'twitter' ? (
                <div className="rounded-xl border border-border p-4 bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-muted" />
                    <div>
                      <div className="text-xs font-bold">Your Account</div>
                      <div className="text-[10px] text-muted-foreground">@yourhandle</div>
                    </div>
                  </div>
                  <div className="text-xs whitespace-pre-wrap leading-relaxed">
                    {postText || <span className="text-muted-foreground italic">Your tweet will appear here...</span>}
                  </div>
                  <div className="flex gap-6 mt-3 text-muted-foreground text-[10px]">
                    <span>Reply</span>
                    <span>Repost</span>
                    <span>Like</span>
                    <span>Share</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border p-4 bg-background">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div>
                      <div className="text-xs font-bold">Your Name</div>
                      <div className="text-[10px] text-muted-foreground">Your headline</div>
                      <div className="text-[9px] text-muted-foreground">Just now</div>
                    </div>
                  </div>
                  <div className="text-xs whitespace-pre-wrap leading-relaxed">
                    {postText || <span className="text-muted-foreground italic">Your LinkedIn post will appear here...</span>}
                  </div>
                  <div className="flex gap-4 mt-3 pt-3 border-t border-border text-muted-foreground text-[10px]">
                    <span>Like</span>
                    <span>Comment</span>
                    <span>Repost</span>
                    <span>Send</span>
                  </div>
                </div>
              )}

              {/* Quick stats */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted p-2.5 text-center">
                  <div className="text-lg font-bold">{charCount}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">Characters</div>
                </div>
                <div className="rounded-lg bg-muted p-2.5 text-center">
                  <div className="text-lg font-bold">{charLimit}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">Limit</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Queue Tab */}
      {tab === 'queue' && (
        <div className="space-y-3">
          {queuedPosts.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="p-8 text-center">
                <div className="text-3xl mb-2">📭</div>
                <div className="font-semibold text-sm">Queue is empty</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Compose a post and add it to the queue to get started.
                </div>
              </CardContent>
            </Card>
          ) : (
            queuedPosts.map((post) => (
              <Card key={post.id} className="bg-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[9px] font-bold">
                          {PLATFORM_ICONS[post.platform]}
                        </span>
                        <span className="text-xs font-semibold">{PLATFORM_LABELS[post.platform]}</span>
                        <Badge className={`text-[9px] ${STATUS_COLORS[post.status]}`}>
                          {post.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {post.text}
                      </p>
                      <div className="text-[10px] text-muted-foreground mt-1.5">
                        {post.text.length} / {PLATFORM_LIMITS[post.platform]} chars
                        {post.scheduledAt && (
                          <span> &middot; Scheduled: {new Date(post.scheduledAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handlePostNow(post)}
                        disabled={posting === post.id}
                      >
                        {posting === post.id ? 'Posting...' : 'Post'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemove(post.id)}
                        className="text-red-400"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-3">
          {historyPosts.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="p-8 text-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="font-semibold text-sm">No post history yet</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Posts will appear here after they are sent.
                </div>
              </CardContent>
            </Card>
          ) : (
            historyPosts.map((post) => (
              <Card key={post.id} className="bg-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[9px] font-bold">
                          {PLATFORM_ICONS[post.platform]}
                        </span>
                        <span className="text-xs font-semibold">{PLATFORM_LABELS[post.platform]}</span>
                        <Badge className={`text-[9px] ${STATUS_COLORS[post.status]}`}>
                          {post.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {post.text}
                      </p>
                      <div className="text-[10px] text-muted-foreground mt-1.5">
                        {post.postedAt && <span>Posted: {new Date(post.postedAt).toLocaleString()}</span>}
                        {post.error && <span className="text-red-400"> &middot; Error: {post.error}</span>}
                        {post.externalUrl && (
                          <span>
                            {' '}&middot;{' '}
                            <a href={post.externalUrl} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
                              View post
                            </a>
                          </span>
                        )}
                      </div>
                    </div>
                    {post.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePostNow(post)}
                        disabled={posting === post.id}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
