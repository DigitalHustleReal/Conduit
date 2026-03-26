'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Template {
  name: string;
  icon: string;
  desc: string;
  fields: string[];
  structure: string[];
  wordCount: string;
}

const TEMPLATES: Template[] = [
  {
    name: 'Article', icon: '📄', desc: 'Standard long-form article with SEO optimization',
    fields: ['Title', 'Meta Description', 'Target Keyword', 'Body', 'Featured Image', 'Tags'],
    structure: ['Introduction (100-150 words)', 'H2: Main Point 1 (200-300 words)', 'H2: Main Point 2 (200-300 words)', 'H2: Main Point 3 (200-300 words)', 'Conclusion with CTA (100-150 words)'],
    wordCount: '1,000-1,500',
  },
  {
    name: 'Product Review', icon: '⭐', desc: 'Detailed product review with pros, cons, and rating',
    fields: ['Product Name', 'Price', 'Rating', 'Pros', 'Cons', 'Verdict', 'Affiliate Link', 'Images'],
    structure: ['Product Overview', 'Key Features', 'Pros & Cons Table', 'Detailed Analysis', 'Pricing Comparison', 'Who Is It For?', 'Final Verdict & Rating'],
    wordCount: '1,500-2,500',
  },
  {
    name: 'How-To Guide', icon: '🔧', desc: 'Step-by-step tutorial with prerequisites and tips',
    fields: ['Title', 'Difficulty Level', 'Time Required', 'Prerequisites', 'Steps', 'Tips', 'FAQ'],
    structure: ['Introduction & What You\'ll Learn', 'Prerequisites', 'Step 1: [First Step]', 'Step 2: [Second Step]', 'Step 3: [Third Step]', 'Pro Tips', 'Troubleshooting FAQ'],
    wordCount: '1,200-2,000',
  },
  {
    name: 'Listicle', icon: '📋', desc: 'Numbered list format for rankings and recommendations',
    fields: ['Title', 'List Count', 'Items', 'Criteria', 'Featured Image'],
    structure: ['Introduction & Selection Criteria', 'Item 1 (Best Overall)', 'Item 2 (Runner Up)', 'Item 3-N (Remaining Items)', 'Comparison Table', 'How We Chose', 'Final Recommendations'],
    wordCount: '2,000-3,000',
  },
  {
    name: 'Comparison', icon: '⚖️', desc: 'Side-by-side comparison of products or services',
    fields: ['Item A', 'Item B', 'Comparison Criteria', 'Winner', 'Use Cases'],
    structure: ['Quick Verdict', 'Overview of Both Options', 'Feature-by-Feature Comparison', 'Pricing Comparison', 'Pros & Cons of Each', 'Use Case Recommendations', 'Final Verdict'],
    wordCount: '1,500-2,500',
  },
  {
    name: 'News Article', icon: '📰', desc: 'News-style reporting with inverted pyramid structure',
    fields: ['Headline', 'Dateline', 'Lead', 'Body', 'Sources', 'Related Articles'],
    structure: ['Lead Paragraph (Who, What, When, Where, Why)', 'Supporting Details', 'Background Context', 'Expert Quotes', 'Impact & Implications', 'What\'s Next'],
    wordCount: '500-800',
  },
  {
    name: 'Tutorial', icon: '🎓', desc: 'In-depth educational content with code or examples',
    fields: ['Title', 'Skill Level', 'Technologies', 'Prerequisites', 'Sections', 'Code Examples'],
    structure: ['Introduction & Goals', 'Prerequisites & Setup', 'Core Concepts', 'Hands-On Section 1', 'Hands-On Section 2', 'Advanced Tips', 'Summary & Next Steps'],
    wordCount: '2,000-4,000',
  },
  {
    name: 'FAQ Page', icon: '❓', desc: 'Frequently asked questions with schema markup support',
    fields: ['Topic', 'Questions', 'Answers', 'Category', 'Schema Markup'],
    structure: ['Introduction', 'General Questions (3-5)', 'Technical Questions (3-5)', 'Pricing/Usage Questions (3-5)', 'Troubleshooting (3-5)', 'Contact CTA'],
    wordCount: '800-1,500',
  },
];

export default function TemplatesPage() {
  const { addContent } = useWorkspace();
  const [preview, setPreview] = useState<Template | null>(null);

  function createFromTemplate(t: Template) {
    const bodyText = t.structure.map((s) => `## ${s}\n\nContent goes here...\n`).join('\n');
    addContent({
      id: Date.now(),
      title: `New ${t.name}`,
      slug: `new-${t.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      content: bodyText,
      body: bodyText,
      status: 'draft',
      collection: 'uncategorized',
      seoScore: 0,
      aiScore: 0,
      wordCount: 0,
      created: Date.now(),
      updated: Date.now(),
      locale: 'en',
      tags: [t.name.toLowerCase()],
    });
    setPreview(null);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Intelligence</p>
        <h1 className="text-2xl font-bold">Content Templates</h1>
        <p className="text-sm text-muted-foreground mt-1">{TEMPLATES.length} pre-built templates for rapid content creation</p>
      </div>

      {/* Template preview */}
      {preview && (
        <Card className="mb-6 ring-1 ring-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{preview.icon}</span>
                <div>
                  <CardTitle className="text-base">{preview.name} Template</CardTitle>
                  <p className="text-xs text-muted-foreground">Target: {preview.wordCount} words</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => createFromTemplate(preview)}>Create from Template</Button>
                <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>Close</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Fields</p>
                <div className="flex flex-wrap gap-1">
                  {preview.fields.map((f) => <Badge key={f} variant="outline" className="text-xs">{f}</Badge>)}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Structure</p>
                <ol className="list-decimal list-inside space-y-1">
                  {preview.structure.map((s, i) => <li key={i} className="text-xs text-muted-foreground">{s}</li>)}
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {TEMPLATES.map((t) => (
          <Card key={t.name} className="hover:ring-1 hover:ring-border transition-all cursor-pointer" onClick={() => setPreview(t)}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{t.icon}</span>
                <CardTitle className="text-sm">{t.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">{t.desc}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {t.fields.slice(0, 4).map((f) => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}
                {t.fields.length > 4 && <Badge variant="outline" className="text-[10px]">+{t.fields.length - 4}</Badge>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{t.wordCount} words</span>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); createFromTemplate(t); }}>Create</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
