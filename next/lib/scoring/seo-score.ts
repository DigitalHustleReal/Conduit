import type { ContentItem } from '@/types/content';
import { analyzeContent, workspaceBenchmarks } from './analyze';

export function heuristicSEOScore(item: ContentItem, allContent: ContentItem[]): number {
  const content = item.content || item.body || '';
  const a = analyzeContent(content);
  const bench = workspaceBenchmarks(allContent);
  let s = 5;

  // Meta Tags (max 16)
  const mt = item.metaTitle || item.seoTitle || '';
  const md = item.metaDescription || item.metaDesc || '';
  if (mt.length >= 30 && mt.length <= 70) s += 8; else if (mt.length >= 10) s += 3;
  if (md.length >= 80 && md.length <= 160) s += 8; else if (md.length >= 50) s += 3;

  // Keyword Optimization (max 18)
  if (item.keyword) {
    s += 4;
    const kwLower = item.keyword.toLowerCase();
    if (item.title?.toLowerCase().includes(kwLower)) s += 4;
    const first100 = content.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
    if (first100.includes(kwLower)) s += 3;
    const h2Text = (content.match(/^##\s.+/gm) || []).join(' ').toLowerCase();
    if (h2Text.includes(kwLower)) s += 3;
    if (content.length > 200) {
      const kwCount = content.toLowerCase().split(kwLower).length - 1;
      const density = (kwCount / a.wordCount) * 100;
      if (density >= 0.5 && density <= 2.5) s += 4;
      else if (density > 2.5) s -= 2;
    }
  }

  // Content Structure (max 14)
  if (a.h2Count >= 1) s += 3; if (a.h2Count >= 3) s += 3;
  if (a.h3Count >= 1) s += 2;
  if (item.slug) s += 3;
  if (item.slug && item.keyword && item.slug.includes(item.keyword.toLowerCase().replace(/\s+/g, '-'))) s += 3;

  // Content Length — dynamic (max 10)
  if (a.wordCount >= 300) s += 2;
  if (a.wordCount >= bench.avgWC * 0.8) s += 3;
  if (a.wordCount >= bench.avgWC) s += 3;
  if (a.wordCount >= bench.p75WC) s += 2;

  // Media & Rich Content (max 10)
  if (a.imageCount >= 1) s += 3; if (a.imageCount >= 3) s += 2;
  if (a.imagesWithAlt >= 1) s += 2;
  if (a.tableCount >= 1) s += 2;
  if (a.faqCount >= 1) s += 1;

  // Internal Linking (max 8)
  if (a.internalLinks >= 1) s += 3; if (a.internalLinks >= 3) s += 3;
  if (a.externalLinks >= 1) s += 2;

  // Readability (max 6)
  if (a.readability.ease >= 40) s += 2; if (a.readability.ease >= 55) s += 2; if (a.readability.ease >= 70) s += 2;

  // Freshness (max 4)
  const ageInDays = item.updated ? Math.round((Date.now() - item.updated) / 86400000) : 365;
  if (ageInDays <= 30) s += 4; else if (ageInDays <= 90) s += 2; else if (ageInDays <= 180) s += 1;
  if (ageInDays > 365) s -= 2;

  // Uniqueness (max 4)
  if (item.title) {
    const dupes = allContent.filter((c) => c.id !== item.id && c.title === item.title);
    if (dupes.length === 0) s += 4; else s -= 3;
  }

  return Math.min(98, Math.max(0, s));
}
