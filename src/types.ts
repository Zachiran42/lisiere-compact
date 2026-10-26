import type { ParsedBook } from './epub/types';

export interface Bookmark {
  id: string;
  chapterIndex: number;
  scroll: number;
  label: string;
  createdAt: number;
}

export interface LibraryBook extends ParsedBook {
  id: string;
  addedAt: number;
  lastOpenedAt?: number;
  chapterIndex: number;
  scroll: number;
  favorite: boolean;
  finished: boolean;
  bookmarks: Bookmark[];
  accent: string;
  sample?: boolean;
}

export interface ReadingSettings {
  theme: 'paper' | 'sepia' | 'night';
  fontSize: number;
  fontFamily: 'serif' | 'sans';
  lineHeight: number;
}

export interface AppState {
  books: LibraryBook[];
  settings: ReadingSettings;
}

export const DEFAULT_SETTINGS: ReadingSettings = {
  theme: 'paper', fontSize: 20, fontFamily: 'serif', lineHeight: 1.8,
};

export function bookProgress(book: LibraryBook): number {
  if (book.finished) return 100;
  if (!book.lastOpenedAt) return 0;
  return Math.min(99, Math.round(((book.chapterIndex + book.scroll) / Math.max(1, book.chapters.length)) * 100));
}
