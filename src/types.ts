export type NovelFormat = 'json' | 'epub' | 'mobi' | 'txt' | 'manual';

export type NovelStatus = 'reading' | 'completed' | 'plan_to_read' | 'favorite' | 'dropped';

export interface Chapter {
  id: string;
  chapterIndex: number;
  title: string;
  content: string; // Plain text or clean HTML
  wordCount: number;
}

export interface Bookmark {
  id: string;
  novelId: string;
  chapterIndex: number;
  chapterTitle: string;
  percentage: number;
  textSnippet: string;
  createdAt: string;
}

export interface ReadingProgress {
  currentChapterIndex: number;
  scrollPercentage: number;
  lastReadAt: string;
  totalTimeSpentSeconds: number; // Reading duration tracker
}

export interface Novel {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl?: string;
  genres: string[];
  language?: string;
  sourceFormat: NovelFormat;
  chapters: Chapter[];
  status: NovelStatus;
  progress: ReadingProgress;
  bookmarks: Bookmark[];
  totalWords: number;
  rating?: number;
  createdAt: string;
  updatedAt: string;
  fileSize?: number;
  r2StorageKey?: string;
}

export type ReaderTheme = 'light' | 'sepia' | 'dark' | 'oled' | 'nord' | 'emerald' | 'custom';

export type ReaderFontFamily = 'literata' | 'merriweather' | 'vietnam' | 'nunito' | 'mono';

export type ReaderContentWidth = 'narrow' | 'medium' | 'wide' | 'full';

export interface ReaderSettings {
  fontSize: number; // 14 to 34
  lineHeight: number; // 1.4 to 2.4
  fontFamily: ReaderFontFamily;
  textAlign: 'left' | 'justify';
  contentWidth: ReaderContentWidth;
  theme: ReaderTheme;
  customBg: string; // hex for 'custom' theme
  customFg: string;
  autoScroll: boolean;
  autoScrollSpeed: number; // 1 to 10
  showProgressBar: boolean;
  speechRate: number; // 0.75 to 1.5
  speechPitch: number; // 0.8 to 1.2
  speechVoiceName?: string;
}

export interface CloudflareConfig {
  accountId?: string;
  d1DatabaseId?: string;
  kvNamespaceId?: string;
  r2BucketName?: string;
  apiEndpoint?: string;
  apiKey?: string;
  syncEnabled: boolean;
  lastSyncedAt?: string;
}

export interface ReadingStats {
  totalNovels: number;
  totalChaptersRead: number;
  totalWordsRead: number;
  totalReadingMinutes: number;
  completedNovels: number;
  favoriteGenre: string;
}
