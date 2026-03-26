'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const AI_TOOLS = [
  { cat: 'Content', name: 'Title Generator', icon: '✏️', desc: 'Generate compelling titles for any topic', credit: 1 },
  { cat: 'Content', name: 'Meta Description', icon: '🏷️', desc: 'SEO-optimized meta descriptions', credit: 1 },
  { cat: 'Content', name: 'Outline Builder', icon: '📋', desc: 'Build structured article outlines', credit: 1 },
  { cat: 'Content', name: 'Article Writer', icon: '📝', desc: 'Full article generation from brief', credit: 1 },
  { cat: 'Content', name: 'Content Expander', icon: '📖', desc: 'Expand short content into detailed sections', credit: 1 },
  { cat: 'Content', name: 'Summarizer', icon: '📄', desc: 'Summarize long content into key points', credit: 1 },
  { cat: 'Content', name: 'Rewriter', icon: '🔄', desc: 'Rewrite content with different tone or style', credit: 1 },
  { cat: 'SEO', name: 'Keyword Researcher', icon: '🔑', desc: 'Discover keyword opportunities and clusters', credit: 1 },
  { cat: 'SEO', name: 'SEO Optimizer', icon: '🔍', desc: 'Optimize content for target keywords', credit: 1 },
  { cat: 'SEO', name: 'Schema Generator', icon: '🧩', desc: 'Generate JSON-LD structured data', credit: 1 },
  { cat: 'SEO', name: 'FAQ Generator', icon: '❓', desc: 'Create FAQ sections from content', credit: 1 },
  { cat: 'SEO', name: 'Internal Link Suggest', icon: '🔗', desc: 'Suggest internal linking opportunities', credit: 1 },
  { cat: 'Social', name: 'Social Brief', icon: '📢', desc: 'Create social media briefs from articles', credit: 1 },
  { cat: 'Social', name: 'Tweet Thread', icon: '🐦', desc: 'Convert content into Twitter threads', credit: 1 },
  { cat: 'Social', name: 'LinkedIn Post', icon: '💼', desc: 'Professional LinkedIn post from content', credit: 1 },
  { cat: 'Social', name: 'YouTube Script', icon: '🎬', desc: 'Turn articles into video scripts', credit: 1 },
  { cat: 'Analysis', name: 'Tone Analyzer', icon: '🎭', desc: 'Analyze and adjust content tone', credit: 1 },
  { cat: 'Analysis', name: 'Competitor Brief', icon: '🏆', desc: 'Analyze competitor content strategy', credit: 1 },
  { cat: 'Analysis', name: 'Content Gap', icon: '📊', desc: 'Find gaps in your content coverage', credit: 1 },
  { cat: 'Analysis', name: 'Readability Check', icon: '👁️', desc: 'Check readability and suggest improvements', credit: 1 },
  { cat: 'Analysis', name: 'Fact Checker', icon: '✅', desc: 'Verify claims and suggest sources', credit: 1 },
];

const CATEGORIES = ['All', 'Content', 'SEO', 'Social', 'Analysis'];
const CAT_COLORS: Record<string, string> = {
  Content: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SEO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Social: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Analysis: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function AIStudioPage() {
  const { credits, deductCredit } = useWorkspace();
  const [activeCat, setActiveCat] = useState('All');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [output, setOutput] = useState('');
  const [search, setSearch] = useState('');

  const filtered = AI_TOOLS.filter((t) => {
    const matchCat = activeCat === 'All' || t.cat === activeCat;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function handleRun(toolName: string) {
    if (activeTool === toolName && inputText) {
      const ok = deductCredit('aiCalls');
      if (!ok) { setOutput('Insufficient credits. Please upgrade your plan.'); return; }
      setOutput(`[${toolName}] Processing: "${inputText.slice(0, 80)}..."\n\nAI output will appear here when connected to a provider. This tool costs 1 credit per run.`);
    } else {
      setActiveTool(toolName);
      setOutput('');
      setInputText('');
    }
  }

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
                  />
                  {output && <div className="rounded bg-muted/50 p-2 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">{output}</div>}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{tool.credit} credit</span>
                <Button size="sm" variant={activeTool === tool.name ? 'default' : 'outline'} onClick={() => handleRun(tool.name)}>
                  {activeTool === tool.name && inputText ? 'Generate' : 'Run'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
