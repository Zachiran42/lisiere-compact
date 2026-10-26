export interface EpubChapter {
  id: string;
  title: string;
  /** Sanitized HTML body; images are embedded and remote resources are removed. */
  html: string;
  /** The chapter's normalized path inside the EPUB archive. */
  href: string;
}

export interface ParsedBook {
  title: string;
  author: string;
  language: string;
  cover?: string;
  chapters: EpubChapter[];
}
