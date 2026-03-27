'use client';

import { useState, useCallback } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { callAI } from '@/lib/ai/call-ai';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const TOOL_PROMPTS: Record<string, string> = {
  'Title Generator': 'Generate 10 compelling, SEO-optimized article titles for the following topic. Include a mix of listicles, how-tos, and question-based titles:\n\n',
  'Meta Description': 'Write 3 SEO-optimized meta descriptions (under 160 characters each) for the following content. Each should include a call to action:\n\n',
  'Outline Builder': 'Create a detailed article outline with H2 and H3 headings, estimated word counts per section, and key points to cover for:\n\n',
  'Article Writer': 'Write a comprehensive, well-structured article based on the following brief. Use proper headings, include actionable tips, and optimize for readability:\n\n',
  'Content Expander': 'Expand the following content into a detailed, well-researched section with examples, data points, and actionable advice:\n\n',
  'Summarizer': 'Summarize the following content into key bullet points, highlighting the most important takeaways:\n\n',
  'Rewriter': 'Rewrite the following content with a professional, engaging tone while preserving the core message and improving readability:\n\n',
  'Keyword Researcher': 'Analyze the following topic and suggest 20 keyword opportunities. For each, estimate search volume (low/med/high), difficulty, and content type needed:\n\n',
  'SEO Optimizer': 'Analyze the following content for SEO and provide specific optimization recommendations including keyword placement, meta tags, headings, and internal linking:\n\n',
  'Schema Generator': 'Generate appropriate JSON-LD structured data (schema.org) for the following content. Include Article, FAQ, or HowTo schema as appropriate:\n\n',
  'FAQ Generator': 'Generate 8-10 frequently asked questions with detailed answers based on the following content. Format as Q&A pairs:\n\n',
  'Internal Link Suggest': 'Suggest internal linking opportunities for the following content. Identify anchor text and target page topics:\n\n',
  'Social Brief': 'Create a social media distribution brief for the following article, including posts for Twitter, LinkedIn, and Instagram:\n\n',
  'Tweet Thread': 'Convert the following content into an engaging Twitter thread (8-12 tweets). Include hooks, key insights, and a CTA:\n\n',
  'LinkedIn Post': 'Write a professional LinkedIn post based on the following content. Include a hook, key insights, and engagement question:\n\n',
  'YouTube Script': 'Convert the following article into a YouTube video script with intro hook, sections, transitions, and CTA:\n\n',
  'Tone Analyzer': 'Analyze the tone of the following content. Identify the current tone, suggest improvements, and provide a rewritten sample in a more engaging tone:\n\n',
  'Competitor Brief': 'Create a competitor content analysis brief for the following topic. Identify gaps, opportunities, and recommended content angles:\n\n',
  'Content Gap': 'Analyze the following topic/niche and identify content gaps. Suggest specific articles to fill those gaps with estimated impact:\n\n',
  'Readability Check': 'Analyze the readability of the following content. Provide a readability score estimate, identify complex sentences, and suggest simplifications:\n\n',
  'Fact Checker': 'Review the following content for factual accuracy. Flag any claims that need verification and suggest authoritative sources:\n\n',
};

const AI_TOOLS = [
  { cat: 'Content', name: 'Title Generator', icon: '\u270F\uFE0F', desc: 'Generate compelling titles for any topic', credit: 1 },
  { cat: 'Content', name: 'Meta Description', icon: '\uD83C\uDFF7\uFE0F', desc: 'SEO-optimized meta descriptions', credit: 1 },
  { cat: 'Content', name: 'Outline Builder', icon: '\uD83D\uDCCB', desc: 'Build structured article outlines', credit: 1 },
  { cat: 'Content', name: 'Article Writer', icon: '\uD83D\uDCDD', desc: 'Full article generation from brief', credit: 1 },
  { cat: 'Content', name: 'Content Expander', icon: '\uD83D\uDCD6', desc: 'Expand short content into detailed sections', credit: 1 },
  { cat: 'Content', name: 'Summarizer', icon: '\uD83D\uDCC4', desc: 'Summarize long content into key points', credit: 1 },
  { cat: 'Content', name: 'Rewriter', icon: '\uD83D\uDD04', desc: 'Rewrite content with different tone or style', credit: 1 },
  { cat: 'SEO', name: 'Keyword Researcher', icon: '\uD83D\uDD11', desc: 'Discover keyword opportunities and clusters', credit: 1 },
  { cat: 'SEO', name: 'SEO Optimizer', icon: '\uD83D\uDD0D', desc: 'Optimize content for target keywords', credit: 1 },
  { cat: 'SEO', name: 'Schema Generator', icon: '\uD83E\uDDE9', desc: 'Generate JSON-LD structured data', credit: 1 },
  { cat: 'SEO', name: 'FAQ Generator', icon: '\u2753', desc: 'Create FAQ sections from content', credit: 1 },
  { cat: 'SEO', name: 'Internal Link Suggest', icon: '\uD83D\uDD17', desc: 'Suggest internal linking opportunities', credit: 1 },
  { cat: 'Social', name: 'Social Brief', icon: '\uD83D\uDCE2', desc: 'Create social media briefs from articles', credit: 1 },
  { cat: 'Social', name: 'Tweet Thread', icon: '\uD83D\uDC26', desc: 'Convert content into Twitter threads', credit: 1 },
  { cat: 'Social', name: 'LinkedIn Post', icon: '\uD83D\uDCBC', desc: 'Professional LinkedIn post from content', credit: 1 },
  { cat: 'Social', name: 'YouTube Script', icon: '\uD83C\uDFAC', desc: 'Turn articles into video scripts', credit: 1 },
  { cat: 'Analysis', name: 'Tone Analyzer', icon: '\uD83C\uDFAD', desc: 'Analyze and adjust content tone', credit: 1 },
  { cat: 'Analysis', name: 'Competitor Brief', icon: '\uD83C\uDFC6', desc: 'Analyze competitor content strategy', credit: 1 },
  { cat: 'Analysis', name: 'Content Gap', icon: '\uD83D\uDCCA', desc: 'Find gaps in your content coverage', credit: 1 },
  { cat: 'Analysis', name: 'Readability Check', icon: '\uD83D\uDC41\uFE0F', desc: 'Check readability and suggest improvements', credit: 1 },
  { cat: 'Analysis', name: 'Fact Checker', icon: '\u2705', desc: 'Verify claims and suggest sources', credit: 1 },
];

const CATEGORIES = ['All', 'Content', 'SEO', 'Social', 'Analysis'];
const CAT_COLORS: Record<string, string> = {
  Content: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SEO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Social: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Analysis: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function AIStudioPage() {
  const { credits, deductCredit, settings } = useWorkspace();
  const [activeCat, setActiveCat] = useState('All');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [output, setOutput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = AI_TOOLS.filter((t) => {
    const matchCat = activeCat === 'All' || t.cat === activeCat;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleRun = useCallback(async (toolName: string) => {
    if (activeTool === toolName && inputText) {
      const ok = deductCredit('aiCalls');
      if (!ok) {
        setOutput('Insufficient credits. Please upgrade your plan or add a BYOK API key in Settings.');
        toast.error('Insufficient credits');
        return;
      }

      setLoading(true);
      setOutput('');

      const toolPrompt = TOOL_PROMPTS[toolName] || `Use the ${toolName} tool on the following input:\n\n`;
      const fullPrompt = toolPrompt + inputText;

      try {
        const result = await callAI(
          fullPrompt,
          {
            provider: settings.aiProvider,
            model: settings.aiModel,
            stream: true,
            onChunk: (chunk) => {
              setOutput((prev) => prev + chunk);
            },
            system: `You are an expert content operations AI assistant specializing in ${toolName.toLowerCase()}. Provide detailed, actionable, and well-formatted output.`,
          },
          settings as unknown as Record<string, string>,
        );
        // If streaming didn't populate output (e.g. non-streaming provider), set it now
        setOutput((prev) => prev || result);
        toast.success(`${toolName} completed`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setOutput(`Error: ${msg}`);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    } else {
      setActiveTool(toolName);
      setOutput('');
      setInputText('');
    }
  }, [activeTool, inputText, deductCredit, settings]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Intelligence</p>
        <h1 className="text-2xl font-bold">AI Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">21 AI tools for content operations. Credits used: {credits.aiCalls}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {CATEGORIES.map((c) => (
          <Button key={c} variant={activeCat === c ? 'default' : 'outline'} size="sm" onClick={() => setActiveCat(c)}>{c}</Button>
        ))}
        <Input placeholder="Search tools..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48 ml-auto" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((tool) => (
          <Card key={tool.name} className={`transition-all ${activeTool === tool.name ? 'ring-1 ring-primary' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xl">{tool.icon}</span>
                <Badge variant="outline" className={CAT_COLORS[tool.cat]}>{tool.cat}</Badge>
              </div>
              <CardTitle className="text-sm">{tool.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">{tool.desc}</p>
              {activeTool === tool.name && (
                <div className="space-y-2 mb-3">
                  <textarea
                    className="w-full rounded border border-border bg-background p-2 text-xs min-h-[60px] resize-y"
                    placeholder={`Enter input for ${tool.name}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={loading}
                  />
                  {(output || loading) && (
                    <div className="rounded bg-muted/50 p-2 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {output}
                      {loading && !output && <span className="text-muted-foreground animate-pulse">Generating...</span>}
                      {loading && output && <span className="text-muted-foreground animate-pulse">|</span>}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{tool.credit} credit</span>
                <Button
                  size="sm"
                  variant={activeTool === tool.name ? 'default' : 'outline'}
                  onClick={() => handleRun(tool.name)}
                  disabled={loading && activeTool === tool.name}
                >
                  {loading && activeTool === tool.name ? 'Generating...' : activeTool === tool.name && inputText ? 'Generate' : 'Run'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
