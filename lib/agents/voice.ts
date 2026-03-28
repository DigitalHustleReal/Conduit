/**
 * Brand Voice Agent -- learns the user's writing style from their
 * existing content and ensures all AI-generated content matches.
 *
 * Analyzes: sentence length, vocabulary level, tone (formal/casual),
 * use of lists vs paragraphs, use of data/stats, personal pronouns,
 * heading style, intro patterns, CTA style
 *
 * 100% heuristic -- 0 credits. Pure text analysis.
 */

import type { ContentItem } from '@/types/content';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrandVoiceProfile {
  avgSentenceLength: number;
  vocabularyLevel: 'simple' | 'moderate' | 'advanced';
  tone: 'casual' | 'professional' | 'authoritative' | 'friendly' | 'academic';
  usesFirstPerson: boolean;
  usesQuestions: boolean;
  prefersLists: boolean;
  prefersData: boolean;
  avgParagraphLength: number;
  headingStyle: 'question' | 'statement' | 'how-to' | 'mixed';
  introPattern: string;
  ctaStyle: string;
  samplePhrases: string[];
  avoidPhrases: string[];
  lastAnalyzed: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\|.*\|/g, '')
    .trim();
}

function getSentences(text: string): string[] {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
}

function getWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function countOccurrences(text: string, patterns: RegExp): number {
  return (text.match(patterns) || []).length;
}

// ---------------------------------------------------------------------------
// Analyze existing content to build a voice profile
// ---------------------------------------------------------------------------

export function analyzeVoice(publishedContent: ContentItem[]): BrandVoiceProfile {
  const published = publishedContent.filter(
    (c) => c.status === 'published' && ((c.content || c.body || '').length > 200),
  );

  if (published.length === 0) {
    return {
      avgSentenceLength: 15,
      vocabularyLevel: 'moderate',
      tone: 'professional',
      usesFirstPerson: false,
      usesQuestions: false,
      prefersLists: false,
      prefersData: false,
      avgParagraphLength: 80,
      headingStyle: 'mixed',
      introPattern: 'Starts with context',
      ctaStyle: 'No pattern detected yet',
      samplePhrases: [],
      avoidPhrases: [],
      lastAnalyzed: Date.now(),
    };
  }

  // Combine all content
  const allTexts = published.map((c) => c.content || c.body || '');
  const allRaw = allTexts.join('\n\n');
  const allPlain = stripMarkdown(allRaw);
  const sentences = getSentences(allPlain);
  const words = getWords(allPlain);
  const wordCount = words.length;

  // 1. Average sentence length
  const avgSentenceLength = sentences.length > 0
    ? Math.round(wordCount / sentences.length)
    : 15;

  // 2. Vocabulary level (based on avg word length)
  const avgWordLength = words.length > 0
    ? words.reduce((sum, w) => sum + w.length, 0) / words.length
    : 5;
  let vocabularyLevel: BrandVoiceProfile['vocabularyLevel'] = 'moderate';
  if (avgWordLength < 4.5) vocabularyLevel = 'simple';
  else if (avgWordLength > 5.5) vocabularyLevel = 'advanced';

  // 3. First person usage
  const firstPersonCount = countOccurrences(
    allPlain.toLowerCase(),
    /\b(i |i'm|i've|we |we're|we've|my |our |myself|ourselves)\b/gi,
  );
  const usesFirstPerson = (firstPersonCount / Math.max(wordCount, 1)) > 0.005;

  // 4. Questions
  const questionCount = countOccurrences(allPlain, /\?/g);
  const usesQuestions = (questionCount / Math.max(sentences.length, 1)) > 0.1;

  // 5. Lists preference
  const listItems = countOccurrences(allRaw, /^[-*]\s+/gm);
  const prefersLists = listItems > sentences.length * 0.15;

  // 6. Data/stats preference
  const numberCount = countOccurrences(allPlain, /\d+(\.\d+)?%|\$[\d,.]+|\d{2,}/g);
  const prefersData = (numberCount / Math.max(sentences.length, 1)) > 0.15;

  // 7. Paragraph length
  const paragraphs = allPlain.split(/\n\n+/).filter((p) => p.trim().length > 20);
  const avgParagraphLength = paragraphs.length > 0
    ? Math.round(paragraphs.reduce((sum, p) => sum + getWords(p).length, 0) / paragraphs.length)
    : 80;

  // 8. Heading style
  const headings = allRaw.match(/^#{2,3}\s+(.+)$/gm) || [];
  const headingTexts = headings.map((h) => h.replace(/^#{2,3}\s+/, ''));
  let questionHeadings = 0;
  let howToHeadings = 0;
  for (const h of headingTexts) {
    if (h.includes('?')) questionHeadings++;
    if (/^(how to|steps to|ways to|guide to)/i.test(h)) howToHeadings++;
  }
  let headingStyle: BrandVoiceProfile['headingStyle'] = 'statement';
  if (headingTexts.length > 0) {
    const qRatio = questionHeadings / headingTexts.length;
    const htRatio = howToHeadings / headingTexts.length;
    if (qRatio > 0.4) headingStyle = 'question';
    else if (htRatio > 0.3) headingStyle = 'how-to';
    else if (qRatio > 0.15 || htRatio > 0.15) headingStyle = 'mixed';
  }

  // 9. Tone detection
  const formalWords = countOccurrences(allPlain.toLowerCase(), /\b(therefore|furthermore|consequently|nevertheless|moreover|hereby|thus|henceforth)\b/g);
  const casualWords = countOccurrences(allPlain.toLowerCase(), /\b(gonna|wanna|kinda|pretty much|basically|awesome|cool|hey|btw|tbh)\b/g);
  const friendlyWords = countOccurrences(allPlain.toLowerCase(), /\b(you'll|you're|let's|we'll|we've|check out|take a look)\b/g);
  const academicWords = countOccurrences(allPlain.toLowerCase(), /\b(research|study|data|analysis|methodology|hypothesis|findings|evidence)\b/g);

  let tone: BrandVoiceProfile['tone'] = 'professional';
  const toneScores = {
    casual: casualWords,
    professional: Math.max(1, formalWords * 0.3),
    authoritative: formalWords,
    friendly: friendlyWords,
    academic: academicWords,
  };
  const topTone = Object.entries(toneScores).sort((a, b) => b[1] - a[1])[0];
  if (topTone && topTone[1] > 0) {
    tone = topTone[0] as BrandVoiceProfile['tone'];
  }

  // 10. Intro pattern
  const intros = allTexts.slice(0, 10).map((t) => {
    const plain = stripMarkdown(t);
    const firstSentence = getSentences(plain)[0] || '';
    return firstSentence.trim();
  }).filter(Boolean);

  let introPattern = 'Starts with context';
  if (intros.length > 0) {
    const statIntros = intros.filter((s) => /\d/.test(s)).length;
    const questionIntros = intros.filter((s) => s.includes('?')).length;
    const storyIntros = intros.filter((s) => /\b(imagine|picture|think about|once upon)\b/i.test(s)).length;

    if (statIntros > intros.length * 0.4) introPattern = 'Starts with a stat';
    else if (questionIntros > intros.length * 0.4) introPattern = 'Starts with a question';
    else if (storyIntros > intros.length * 0.3) introPattern = 'Starts with a story';
  }

  // 11. CTA style
  const endings = allTexts.slice(0, 10).map((t) => {
    const sents = getSentences(stripMarkdown(t));
    return sents[sents.length - 1]?.trim() || '';
  }).filter(Boolean);

  let ctaStyle = 'Ends with summary';
  if (endings.length > 0) {
    const actionEndings = endings.filter((s) => /\b(sign up|subscribe|download|try|get started|contact|learn more)\b/i.test(s)).length;
    const questionEndings = endings.filter((s) => s.includes('?')).length;
    if (actionEndings > endings.length * 0.3) ctaStyle = 'Direct call-to-action';
    else if (questionEndings > endings.length * 0.3) ctaStyle = 'Ends with a question';
  }

  // 12. Sample phrases (common 3-grams)
  const trigrams: Record<string, number> = {};
  const lowerWords = words.map((w) => w.toLowerCase().replace(/[^a-z']/g, '')).filter((w) => w.length > 2);
  for (let i = 0; i < lowerWords.length - 2; i++) {
    const gram = `${lowerWords[i]} ${lowerWords[i + 1]} ${lowerWords[i + 2]}`;
    trigrams[gram] = (trigrams[gram] || 0) + 1;
  }
  const samplePhrases = Object.entries(trigrams)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase]) => phrase);

  return {
    avgSentenceLength,
    vocabularyLevel,
    tone,
    usesFirstPerson,
    usesQuestions,
    prefersLists,
    prefersData,
    avgParagraphLength,
    headingStyle,
    introPattern,
    ctaStyle,
    samplePhrases,
    avoidPhrases: [],
    lastAnalyzed: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Generate voice guidance for AI prompts
// ---------------------------------------------------------------------------

export function getVoiceGuidance(profile: BrandVoiceProfile): string {
  const lines: string[] = [];

  lines.push(`BRAND VOICE GUIDELINES:`);
  lines.push(`- Tone: ${profile.tone}`);
  lines.push(`- Average sentence length: ${profile.avgSentenceLength} words (${profile.avgSentenceLength < 15 ? 'keep sentences short and punchy' : profile.avgSentenceLength > 22 ? 'longer, flowing sentences are OK' : 'moderate sentence length'})`);
  lines.push(`- Vocabulary: ${profile.vocabularyLevel} (${profile.vocabularyLevel === 'simple' ? 'use everyday words' : profile.vocabularyLevel === 'advanced' ? 'technical/sophisticated language OK' : 'balance technical and accessible'})`);
  lines.push(`- ${profile.usesFirstPerson ? 'USE first person (I, we, our)' : 'AVOID first person, use "you" or third person'}`);
  lines.push(`- ${profile.usesQuestions ? 'Include rhetorical questions to engage readers' : 'Avoid rhetorical questions, use declarative statements'}`);
  lines.push(`- ${profile.prefersLists ? 'Use bullet points and numbered lists frequently' : 'Prefer prose paragraphs over lists'}`);
  lines.push(`- ${profile.prefersData ? 'Include statistics, numbers, and data points' : 'Focus on explanations over raw data'}`);
  lines.push(`- Paragraph length: ~${profile.avgParagraphLength} words per paragraph`);
  lines.push(`- Heading style: ${profile.headingStyle}`);
  lines.push(`- Intro pattern: ${profile.introPattern}`);
  lines.push(`- Endings: ${profile.ctaStyle}`);

  if (profile.samplePhrases.length > 0) {
    lines.push(`- Characteristic phrases: "${profile.samplePhrases.slice(0, 5).join('", "')}"`);
  }

  if (profile.avoidPhrases.length > 0) {
    lines.push(`- AVOID these phrases: "${profile.avoidPhrases.join('", "')}"`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Score how well a draft matches the brand voice (0-100)
// ---------------------------------------------------------------------------

export function scoreVoiceMatch(draft: string, profile: BrandVoiceProfile): number {
  if (!draft || draft.length < 100) return 0;

  const plain = stripMarkdown(draft);
  const sentences = getSentences(plain);
  const words = getWords(plain);
  const wordCount = words.length;
  let score = 50; // start neutral

  // Sentence length match (+-20%)
  const draftAvgSentence = sentences.length > 0 ? wordCount / sentences.length : 15;
  const sentenceDiff = Math.abs(draftAvgSentence - profile.avgSentenceLength) / Math.max(profile.avgSentenceLength, 1);
  if (sentenceDiff < 0.2) score += 10;
  else if (sentenceDiff < 0.4) score += 5;
  else score -= 5;

  // First person match
  const fpCount = countOccurrences(plain.toLowerCase(), /\b(i |i'm|we |we're|my |our )\b/gi);
  const usesFP = (fpCount / Math.max(wordCount, 1)) > 0.005;
  if (usesFP === profile.usesFirstPerson) score += 8;
  else score -= 5;

  // Questions match
  const qCount = countOccurrences(plain, /\?/g);
  const usesQ = (qCount / Math.max(sentences.length, 1)) > 0.1;
  if (usesQ === profile.usesQuestions) score += 5;
  else score -= 3;

  // Lists match
  const listItems = countOccurrences(draft, /^[-*]\s+/gm);
  const usesLists = listItems > sentences.length * 0.15;
  if (usesLists === profile.prefersLists) score += 5;
  else score -= 3;

  // Data match
  const numCount = countOccurrences(plain, /\d+(\.\d+)?%|\$[\d,.]+|\d{2,}/g);
  const usesData = (numCount / Math.max(sentences.length, 1)) > 0.15;
  if (usesData === profile.prefersData) score += 5;
  else score -= 3;

  // Paragraph length match
  const paragraphs = plain.split(/\n\n+/).filter((p) => p.trim().length > 20);
  const draftAvgPara = paragraphs.length > 0
    ? paragraphs.reduce((sum, p) => sum + getWords(p).length, 0) / paragraphs.length
    : 80;
  const paraDiff = Math.abs(draftAvgPara - profile.avgParagraphLength) / Math.max(profile.avgParagraphLength, 1);
  if (paraDiff < 0.3) score += 7;
  else if (paraDiff < 0.5) score += 3;
  else score -= 3;

  // Vocabulary match
  const avgWordLen = words.length > 0
    ? words.reduce((sum, w) => sum + w.length, 0) / words.length
    : 5;
  let draftVocab: BrandVoiceProfile['vocabularyLevel'] = 'moderate';
  if (avgWordLen < 4.5) draftVocab = 'simple';
  else if (avgWordLen > 5.5) draftVocab = 'advanced';
  if (draftVocab === profile.vocabularyLevel) score += 10;
  else score -= 3;

  return Math.max(0, Math.min(100, score));
}
