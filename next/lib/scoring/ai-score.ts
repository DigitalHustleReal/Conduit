import type { ContentItem } from '@/types/content';
import { analyzeContent, workspaceBenchmarks } from './analyze';

export function heuristicAIScore(item: ContentItem, allContent: ContentItem[]): number {
  const content = item.content || item.body || '';
  const a = analyzeContent(content);
  const bench = workspaceBenchmarks(allContent);
  let s = 10;

  // Content Depth (max 18)
  if (a.wordCount >= bench.avgWC * 0.5) s += 4;
  if (a.wordCount >= bench.avgWC) s += 5;
  if (a.wordCount >= bench.p75WC) s += 5;
  if (a.wordCount >= bench.p75WC * 1.5) s += 4;

  // Structure (max 20)
  if (a.h2Count >= 1) s += 4; if (a.h2Count >= 3) s += 3; if (a.h2Count >= 5) s += 2;
  if (a.h3Count >= 1) s += 2;
  if (a.listCount >= 1) s += 3;
  if (a.tableCount >= 1) s += 3;
  if (a.faqCount >= 1) s += 3;

  // Media (max 10)
  if (a.imageCount >= 1) s += 3; if (a.imageCount >= 3) s += 3;
  if (a.imagesWithAlt >= 1) s += 2;
  if (a.imageCount > 0 && a.imagesWithAlt === a.imageCount) s += 2;

  // Readability (max 14)
  if (a.readability.ease >= 50) s += 3; if (a.readability.ease >= 60) s += 3; if (a.readability.ease >= 70) s += 3;
  if (a.avgWordsPerSentence <= 20) s += 3;
  if (a.avgWordsPerParagraph <= 200) s += 2;

  // Writing Quality (max 10)
  if (a.sentenceVariety >= 60) s += 4;
  if (a.sentenceVariety >= 80) s += 2;
  if (a.boldCount >= 2) s += 2;
  if (a.codeBlocks >= 1) s += 2;

  // Metadata (max 10)
  if (item.tags?.length > 0) s += 2; if ((item.tags?.length || 0) >= 3) s += 2;
  if ((item.metaDescription || item.metaDesc || '').length > 50) s += 3;
  if ((item.metaTitle || item.seoTitle || '').length > 10) s += 3;

  // Keyword (max 8)
  if (item.keyword) s += 4;
  if (item.keyword && item.title?.toLowerCase().includes(item.keyword.toLowerCase())) s += 4;

  // Links (max 8)
  if (a.internalLinks >= 1) s += 2; if (a.internalLinks >= 3) s += 2;
  if (a.externalLinks >= 1) s += 2;
  if (a.totalLinks >= bench.avgLinks) s += 2;

  return Math.min(98, Math.max(0, s));
}
