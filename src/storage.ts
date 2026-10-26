import * as FileSystem from 'expo-file-system/legacy';
import type { AppState, LibraryBook } from './types';

type BookMetadata = Omit<LibraryBook, 'chapters' | 'cover'>;
type BookContent = Pick<LibraryBook, 'chapters' | 'cover'>;
type Manifest = { version: 1; books: BookMetadata[]; settings: AppState['settings'] };

const directory = () => {
  if (!FileSystem.documentDirectory) throw new Error('Le stockage local est indisponible sur cet appareil.');
  return `${FileSystem.documentDirectory}lisiere/`;
};
const contentPath = (id: string) => `${directory()}book-${encodeURIComponent(id)}.json`;
let queue: Promise<void> = Promise.resolve();
const savedContent = new Map<string, LibraryBook['chapters']>();
const knownContentIds = new Set<string>();
let lastManifestIds = new Set<string>();
let usingBackup = false;

export async function loadState(): Promise<AppState | null> {
  for (const file of await FileSystem.readDirectoryAsync(directory()).catch(() => [])) {
    if (file.startsWith('book-') && file.endsWith('.json')) {
      try { knownContentIds.add(decodeURIComponent(file.slice(5, -5))); } catch { /* Ignore unrelated malformed filenames. */ }
    }
  }
  let indexExists = false;
  for (const file of ['library.json', 'library.backup.json']) {
    const path = `${directory()}${file}`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) continue;
    indexExists = true;
    try {
      const manifest = JSON.parse(await FileSystem.readAsStringAsync(path)) as Manifest;
      if (manifest.version !== 1 || !Array.isArray(manifest.books) || !manifest.settings) throw new Error('Invalid manifest');
      const books = await Promise.all(manifest.books.map(async (metadata) => {
        if (typeof metadata.id !== 'string') throw new Error('Invalid book');
        const content = JSON.parse(await FileSystem.readAsStringAsync(contentPath(metadata.id))) as BookContent;
        if (!Array.isArray(content.chapters) || !content.chapters.length) throw new Error('Invalid chapters');
        return { ...metadata, ...content } as LibraryBook;
      }));
      savedContent.clear();
      books.forEach((book) => savedContent.set(book.id, book.chapters));
      lastManifestIds = new Set(books.map((book) => book.id));
      usingBackup = file === 'library.backup.json';
      return { books, settings: manifest.settings };
    } catch {
      // A completed backup lets us recover if a previous save was interrupted.
    }
  }
  if (!indexExists) return null;
  throw new Error('La bibliothèque locale ne peut pas être ouverte. Fermez puis relancez l’application. Vos fichiers EPUB d’origine ne sont pas modifiés.');
}

async function persist(state: AppState): Promise<void> {
  await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
  const books: BookMetadata[] = [];
  for (const book of state.books) {
    const { chapters, cover, ...metadata } = book;
    if (savedContent.get(book.id) !== chapters) {
      await FileSystem.writeAsStringAsync(contentPath(book.id), JSON.stringify({ chapters, cover }));
      savedContent.set(book.id, chapters);
      knownContentIds.add(book.id);
    }
    books.push(metadata);
  }
  const manifest: Manifest = { version: 1, books, settings: state.settings };
  const temporaryPath = `${directory()}library.pending.json`;
  const currentPath = `${directory()}library.json`;
  const backupPath = `${directory()}library.backup.json`;
  // Each move has an absent destination. The backup remains readable if the
  // application stops between the two moves; no partial JSON becomes current.
  await FileSystem.writeAsStringAsync(temporaryPath, JSON.stringify(manifest));
  if ((await FileSystem.getInfoAsync(currentPath)).exists) {
    if (usingBackup) {
      await FileSystem.deleteAsync(currentPath, { idempotent: true });
    } else {
      await FileSystem.deleteAsync(backupPath, { idempotent: true });
      await FileSystem.moveAsync({ from: currentPath, to: backupPath });
      usingBackup = true;
    }
  }
  await FileSystem.moveAsync({ from: temporaryPath, to: currentPath });
  const nextIds = new Set(books.map((book) => book.id));
  const retained = new Set([...lastManifestIds, ...nextIds]);
  lastManifestIds = nextIds;
  usingBackup = false;
  for (const id of knownContentIds) {
    if (!retained.has(id)) {
      // The index is committed first, so cleanup failure cannot remove a live book.
      await FileSystem.deleteAsync(contentPath(id), { idempotent: true }).catch(() => undefined);
      savedContent.delete(id);
      knownContentIds.delete(id);
    }
  }
}

export function saveState(state: AppState): Promise<void> {
  const result = queue.catch(() => undefined).then(() => persist(state)).catch(() => {
    throw new Error('Impossible d’enregistrer la bibliothèque. Vérifiez l’espace disponible sur votre appareil.');
  });
  queue = result;
  return result;
}
