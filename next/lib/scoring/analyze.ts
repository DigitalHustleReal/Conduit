import type { ContentAnalysis, ContentItem, ReadabilityResult } from '@/types/content';
import { fleschKincaid } from './readability';

export function analyzeContent(content: string): ContentAnalysis {
  const c = content || '';
  const words = c.split(/\s+/).filter(Boolean);
  const wc = words.length;
  const sentences = c.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const paragraphs = c.split(/\n\n+/).filter((p) => p.trim().length > 20);
  const h2s = c.match(/^##\s|<h2/gim) || [];
  const h3s = c.match(/^###\s|<h3/gim) || [];
  const images = c.match(/<img\s|!\[/g) || [];
  const imgsWithAlt = c.match(/alt=["'][^"']+["']/g) || [];
  const internalLinks = c.match(/\[.*?\]\((?!http).*?\)/g) || [];
  const externalLinks = [...(c.match(/\[.*?\]\(https?:\/\/.*?\)/g) || []), ...(c.match(/<a\s+href=["']https?:\/\//gi) || [])];
  const allLinks = internalLinks.length + externalLinks.length + (c.match(/<a\s/gi) || []).length;
  const lists = [...(c.match(/^[-*]\s/gm) || []), ...(c.match(/<[uo]l/gi) || [])];
  const tables = [...(c.match(/\|.*\|.*\|/g) || []), ...(c.match(/<table/gi) || [])];
  const faqs = c.match(/^###?\s.*\?/gm) || [];
  const codeBlocks = c.match(/```/g) || [];
  const boldText = [...(c.match(/\*\*[^*]+\*\*/g) || []), ...(c.match(/<strong/gi) || [])];

  const starters = sentences.map((s) => s.trim().split(/\s+/)[0]?.toLowerCase()).filter(Boolean);
  const uniqueStarters = [...new Set(starters)];
  const fk = fleschKincaid(c);

  return {
    wordCount: wc,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    h2Count: h2s.length,
    h3Count: h3s.length,
    headingDepth: h2s.length + h3s.length,
    imageCount: images.length,
    imagesWithAlt: imgsWithAlt.length,
    internalLinks: internalLinks.length,
    externalLinks: externalLinks.length,
    totalLinks: allLinks,
    listCount: lists.length,
    tableCount: tables.length,
    faqCount: faqs.length,
    codeBlocks: Math.floor(codeBlocks.length / 2),
    boldCount: boldText.length,
    sentenceVariety: starters.length > 3 ? Math.round((uniqueStarters.length / starters.length) * 100) : 0,
    avgWordsPerSentence: sentences.length ? Math.round(wc / sentences.length) : 0,
    avgWordsPerParagraph: paragraphs.length ? Math.round(wc / paragraphs.length) : 0,
    readability: fk,
  };
}

export function workspaceBenchmarks(content: ContentItem[]) {
  const pub = content.filter((c) => c.status === 'published' && (c.wordCount || 0) > 100);
  if (pub.length < 3) return { avgWC: 1000, avgH2: 3, avgImages: 1, avgLinks: 2, avgSEO: 60, avgAI: 60, p75WC: 1500, p75SEO: 75 };

  const wcs = pub.map((c) => c.wordCount || 0).sort((a, b) => a - b);
  const seos = pub.map((c) => c.seoScore || 0).sort((a, b) => a - b);
  const p75 = (arr: number[]) => arr[Math.floor(arr.length * 0.75)] || arr[arr.length - 1];
  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

  const contents = pub.map((c) => c.content || c.body || '');
  const avgH2 = avg(contents.map((c) => (c.match(/^##\s|<h2/gim) || []).length));
  const avgImgs = avg(contents.map((c) => (c.match(/<img|!\[/g) || []).length));
  const avgLinks = avg(contents.map((c) => (c.match(/\[.*?\]\(.*?\)/g) || []).length));

  return { avgWC: avg(wcs), avgH2, avgImages: avgImgs, avgLinks, avgSEO: avg(seos), avgAI: avg(pub.map((c) => c.aiScore || 0)), p75WC: p75(wcs), p75SEO: p75(seos) };
}
