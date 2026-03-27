export interface ContentItem {
  id: number;
  title: string;
  slug?: string;
  content?: string;
  body?: string;
  excerpt?: string;
  collection?: string;
  author?: string;
  status: 'draft' | 'review' | 'published' | 'scheduled' | 'archived';
  keyword?: string;
  metaTitle?: string;
  seoTitle?: string;
  metaDescription?: string;
  metaDesc?: string;
  tags?: string[];
  locale?: string;
  featuredImage?: string;
  ogImage?: string;
  wordCount: number;
  aiScore: number;
  seoScore: number;
  publishDate?: number;
  scheduledAt?: number;
  created: number;
  updated: number;
  _readability?: ReadabilityResult;
  _analysis?: ContentAnalysis;
  _lastSaved?: number;
  _lastSavedContent?: string;
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color?: string;
  description?: string;
  fields: CollectionField[];
  count?: number;
  apiEndpoint?: string;
}

export interface CollectionField {
  n: string;
  t: 'text' | 'textarea' | 'richtext' | 'select' | 'tags' | 'media' | 'reference' | 'datetime' | 'number' | 'json' | 'slug' | 'color' | 'email';
  req?: boolean;
  ai?: boolean;
  opts?: string[];
}

export interface Keyword {
  id: number;
  keyword: string;
  term?: string;
  volume: number;
  difficulty: number;
  cpc?: number;
  position?: number;
  pos?: number;
  status: 'tracked' | 'top5' | 'top10' | 'top20' | 'opportunity' | 'lost';
  trend?: 'up' | 'down' | 'stable';
  url?: string;
}

export interface PipelineItem {
  id: number;
  title: string;
  stage: 'backlog' | 'writing' | 'review' | 'published';
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
  keyword?: string;
  contentId?: number;
  updated: number;
}

export interface MediaItem {
  id: number;
  name: string;
  url: string;
  type: string;
  size?: number;
  alt?: string;
  source?: 'upload' | 'pexels' | 'pixabay' | 'ai' | 'url';
  metadata?: Record<string, unknown>;
  created: number;
}

export interface ReadabilityResult {
  grade: number;
  ease: number;
  level: string;
  sentences: number;
  words: number;
  syllables: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
}

export interface ContentAnalysis {
  wordCount: number;
  sentences: number;
  paragraphs: number;
  h2Count: number;
  h3Count: number;
  headingDepth: number;
  imageCount: number;
  imagesWithAlt: number;
  internalLinks: number;
  externalLinks: number;
  totalLinks: number;
  listCount: number;
  tableCount: number;
  faqCount: number;
  codeBlocks: number;
  boldCount: number;
  sentenceVariety: number;
  avgWordsPerSentence: number;
  avgWordsPerParagraph: number;
  readability: ReadabilityResult;
}
