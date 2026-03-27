import type { ReadabilityResult } from '@/types/content';

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  let count = 0;
  const vowels = 'aeiouy';
  let prevVowel = false;
  for (let i = 0; i < w.length; i++) {
    const isVowel = vowels.includes(w[i]);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }
  if (w.endsWith('e') && count > 1) count--;
  if (w.endsWith('le') && w.length > 3 && !vowels.includes(w[w.length - 3])) count++;
  return Math.max(1, count);
}

export function fleschKincaid(text: string): ReadabilityResult {
  if (!text || text.length < 10) {
    return { grade: 0, ease: 0, level: 'N/A', sentences: 0, words: 0, syllables: 0, avgWordsPerSentence: 0, avgSyllablesPerWord: 0 };
  }

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const words = text.split(/\s+/).filter(Boolean);
  const syllables = words.reduce((a, w) => a + countSyllables(w), 0);

  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = Math.max(1, words.length);

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllables / wordCount;

  const ease = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  const clampedEase = Math.max(0, Math.min(100, ease));
  let level = 'Very Hard';
  if (clampedEase >= 90) level = 'Very Easy';
  else if (clampedEase >= 80) level = 'Easy';
  else if (clampedEase >= 70) level = 'Fairly Easy';
  else if (clampedEase >= 60) level = 'Standard';
  else if (clampedEase >= 50) level = 'Fairly Hard';
  else if (clampedEase >= 30) level = 'Hard';

  return {
    grade: Math.round(grade * 10) / 10,
    ease: Math.round(clampedEase * 10) / 10,
    level,
    sentences: sentenceCount,
    words: wordCount,
    syllables,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
  };
}
