'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Prompt { name: string; cat: string; desc: string; text: string }

const PROMPTS: Prompt[] = [
  // Content
  { name: 'Write Article', cat: 'Content', desc: 'Full article from topic and keywords', text: 'Write a comprehensive article about [TOPIC] targeting the keyword [KEYWORD]. Include an introduction, 3-5 main sections with H2 headings, and a conclusion.' },
  { name: 'Product Review', cat: 'Content', desc: 'In-depth product review', text: 'Write a detailed product review for [PRODUCT]. Include pros, cons, features, pricing, and a verdict.' },
  { name: 'Comparison Post', cat: 'Content', desc: 'Compare two or more items', text: 'Write a comparison article between [ITEM A] and [ITEM B]. Include a feature-by-feature comparison table and recommendation.' },
  { name: 'How-To Guide', cat: 'Content', desc: 'Step-by-step tutorial', text: 'Write a step-by-step how-to guide for [TASK]. Include prerequisites, numbered steps, tips, and troubleshooting.' },
  { name: 'Listicle', cat: 'Content', desc: 'Numbered list article', text: 'Write a listicle: "[NUMBER] Best [ITEMS] for [PURPOSE]". Include descriptions, pros/cons, and prices for each item.' },
  { name: 'News Article', cat: 'Content', desc: 'News-style reporting', text: 'Write a news article about [EVENT/TOPIC]. Use inverted pyramid structure with the most important facts first.' },
  { name: 'Case Study', cat: 'Content', desc: 'Detailed case study', text: 'Write a case study about [SUBJECT]. Include background, challenge, solution, results with metrics, and key takeaways.' },
  { name: 'Interview Format', cat: 'Content', desc: 'Q&A style content', text: 'Create an interview-style article with [PERSON/EXPERT] about [TOPIC]. Generate insightful questions and comprehensive answers.' },
  { name: 'Opinion Piece', cat: 'Content', desc: 'Thought leadership', text: 'Write an opinion article about [TOPIC] arguing that [POSITION]. Support with evidence and address counterarguments.' },
  // SEO
  { name: 'Keyword Cluster', cat: 'SEO', desc: 'Group related keywords', text: 'Generate a keyword cluster around the seed keyword [KEYWORD]. Group into pillar, supporting, and long-tail keywords with search intent.' },
  { name: 'Meta Tags', cat: 'SEO', desc: 'Title and description', text: 'Generate 5 SEO title tag variations and 3 meta descriptions for a page about [TOPIC] targeting [KEYWORD]. Keep titles under 60 chars and descriptions under 155 chars.' },
  { name: 'FAQ Schema', cat: 'SEO', desc: 'FAQ section for schema', text: 'Generate 8-10 FAQ questions and answers about [TOPIC] optimized for FAQ schema markup and featured snippets.' },
  { name: 'Title Variations', cat: 'SEO', desc: 'Multiple title options', text: 'Generate 10 title variations for an article about [TOPIC]. Mix formats: how-to, listicle, question, power words, numbers.' },
  { name: 'Slug Optimizer', cat: 'SEO', desc: 'URL-friendly slugs', text: 'Generate 5 SEO-optimized URL slugs for: [TITLE]. Keep short, include primary keyword, use hyphens.' },
  { name: 'Content Brief', cat: 'SEO', desc: 'Comprehensive brief', text: 'Create a content brief for [KEYWORD]: target word count, H2/H3 outline, competitor gaps, entities to mention, internal link targets.' },
  { name: 'Competitor Analysis', cat: 'SEO', desc: 'Analyze competitor content', text: 'Analyze the top-ranking content for [KEYWORD]. Identify their structure, word count, unique angles, and gaps we can exploit.' },
  // Social
  { name: 'Twitter Thread', cat: 'Social', desc: 'Multi-tweet thread', text: 'Convert this article into a Twitter thread (8-12 tweets). Hook first tweet, actionable insights, end with CTA. Article: [CONTENT]' },
  { name: 'LinkedIn Carousel', cat: 'Social', desc: 'Slide-by-slide content', text: 'Create a LinkedIn carousel (10 slides) from this content. Each slide: bold headline, 2-3 lines. Include hook slide and CTA. Topic: [TOPIC]' },
  { name: 'Instagram Caption', cat: 'Social', desc: 'Engaging IG caption', text: 'Write an Instagram caption for a post about [TOPIC]. Include emoji, storytelling hook, value, CTA, and 20 relevant hashtags.' },
  { name: 'YouTube Description', cat: 'Social', desc: 'Video description', text: 'Write a YouTube video description for: [VIDEO TITLE]. Include timestamps, key points, links section, and keyword-rich summary.' },
  { name: 'TikTok Script', cat: 'Social', desc: 'Short-form video script', text: 'Write a 60-second TikTok script about [TOPIC]. Hook in first 3 seconds, fast-paced delivery, trending format.' },
  { name: 'Email Subject Lines', cat: 'Social', desc: 'High-open-rate subjects', text: 'Generate 10 email subject lines for [TOPIC/OFFER]. Mix curiosity, urgency, personalization, and benefit-driven approaches.' },
  { name: 'Newsletter', cat: 'Social', desc: 'Email newsletter', text: 'Write a newsletter about [TOPIC] for our audience of [AUDIENCE]. Include intro, 3 sections, links, and personal sign-off.' },
  // Analysis
  { name: 'Content Audit', cat: 'Analysis', desc: 'Audit existing content', text: 'Audit this content for quality, accuracy, and SEO. Score 1-10 on: readability, keyword usage, structure, E-E-A-T, uniqueness. Content: [CONTENT]' },
  { name: 'Gap Analysis', cat: 'Analysis', desc: 'Find content gaps', text: 'Analyze content gaps in the [NICHE] space. What topics are underserved? What questions remain unanswered? Suggest 10 article ideas.' },
  { name: 'Tone Check', cat: 'Analysis', desc: 'Verify tone consistency', text: 'Analyze the tone of this content. Is it [TARGET TONE]? Highlight inconsistencies and suggest rewrites. Content: [CONTENT]' },
  { name: 'Readability Improve', cat: 'Analysis', desc: 'Simplify content', text: 'Improve the readability of this content to a [GRADE] level. Shorten sentences, simplify words, add transitions. Content: [CONTENT]' },
  { name: 'Fact Verify', cat: 'Analysis', desc: 'Check claims', text: 'Identify all factual claims in this content. For each, assess confidence and suggest authoritative sources. Content: [CONTENT]' },
  { name: 'Source Suggest', cat: 'Analysis', desc: 'Find supporting sources', text: 'Suggest 10 authoritative sources to cite in an article about [TOPIC]. Include research papers, industry reports, expert quotes.' },
  // Strategy
  { name: 'Content Calendar', cat: 'Strategy', desc: 'Monthly plan', text: 'Create a 30-day content calendar for a [NICHE] site. Include: date, title, keyword, content type, distribution channels.' },
  { name: 'Topic Cluster', cat: 'Strategy', desc: 'Pillar + cluster map', text: 'Design a topic cluster around [PILLAR TOPIC]. Include 1 pillar page and 8-12 cluster pages with internal linking strategy.' },
  { name: 'Pillar Plan', cat: 'Strategy', desc: 'Pillar page strategy', text: 'Create a pillar page plan for [TOPIC]. Include: outline (3000+ words), target keywords per section, internal links, CTAs, schema.' },
  { name: 'Distribution Plan', cat: 'Strategy', desc: 'Multi-channel plan', text: 'Create a content distribution plan for [ARTICLE]. Include: social platforms, email, syndication, repurposing ideas, timeline.' },
  { name: 'Monetization Review', cat: 'Strategy', desc: 'Revenue opportunities', text: 'Review monetization opportunities for a [NICHE] content site. Analyze: ads, affiliates, products, sponsorships, memberships.' },
];

const CATEGORIES = ['All', 'Content', 'SEO', 'Social', 'Analysis', 'Strategy'];
const CAT_COLORS: Record<string, string> = {
  Content: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SEO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Social: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Analysis: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Strategy: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function PromptLibraryPage() {
  const [activeCat, setActiveCat] = useState('All');
  const [search, setSearch] = useState('');
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [copied, setCopied] = useState(false);

  const filtered = PROMPTS.filter((p) => {
    const matchCat = activeCat === 'All' || p.cat === activeCat;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function copyPrompt(p: Prompt) {
    navigator.clipboard.writeText(p.text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Intelligence</p>
        <h1 className="text-2xl font-bold">Prompt Library</h1>
        <p className="text-sm text-muted-foreground mt-1">{PROMPTS.length} built-in prompts across {CATEGORIES.length - 1} categories</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {CATEGORIES.map((c) => (
          <Button key={c} variant={activeCat === c ? 'default' : 'outline'} size="sm" onClick={() => setActiveCat(c)}>
            {c} {c !== 'All' && <span className="ml-1 text-[10px] opacity-60">({PROMPTS.filter((p) => p.cat === c).length})</span>}
          </Button>
        ))}
        <Input placeholder="Search prompts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48 ml-auto" />
      </div>

      {/* Active prompt modal */}
      {activePrompt && (
        <Card className="mb-4 ring-1 ring-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{activePrompt.name}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActivePrompt(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded bg-muted/50 p-3 text-xs whitespace-pre-wrap font-mono mb-3">{activePrompt.text}</div>
            <Button size="sm" onClick={() => copyPrompt(activePrompt)}>{copied ? 'Copied!' : 'Copy to Clipboard'}</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((p) => (
          <Card key={p.name} className="hover:ring-1 hover:ring-border transition-all cursor-pointer" onClick={() => setActivePrompt(p)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{p.name}</CardTitle>
                <Badge variant="outline" className={CAT_COLORS[p.cat]}>{p.cat}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">{p.desc}</p>
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); copyPrompt(p); }}>
                  {copied && activePrompt?.name === p.name ? 'Copied!' : 'Use'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
