import type { AppState, LibraryBook } from './types';

type BookMetadata = Omit<LibraryBook, 'chapters' | 'cover'>;
type BookContent = Pick<LibraryBook, 'chapters' | 'cover'>;
type Manifest = { version: 1; books: BookMetadata[]; settings: AppState['settings'] };

let databasePromise: Promise<IDBDatabase> | null = null;
let queue: Promise<void> = Promise.resolve();
const savedContent = new Map<string, LibraryBook['chapters']>();

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Le stockage du navigateur est indisponible. Ouvrez Lisière dans un navigateur récent.'));
      return;
    }
    let abandoned = false;
    const request = indexedDB.open('lisiere-library', 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('books')) database.createObjectStore('books');
      if (!database.objectStoreNames.contains('state')) database.createObjectStore('state');
    };
    request.onsuccess = () => {
      const database = request.result;
      if (abandoned) { database.close(); return; }
      database.onversionchange = () => { database.close(); databasePromise = null; };
      resolve(database);
    };
    request.onerror = () => reject(new Error('Le navigateur refuse le stockage de la bibliothèque. Vérifiez ses paramètres de confidentialité.'));
    request.onblocked = () => {
      abandoned = true;
      reject(new Error('Fermez les autres onglets de Lisière, puis réessayez.'));
    };
  }).catch((error) => { databasePromise = null; throw error; });
  return databasePromise;
}

export async function loadState(): Promise<AppState | null> {
  const database = await openDatabase();
  return new Promise<AppState | null>((resolve, reject) => {
    const transaction = database.transaction(['state', 'books'], 'readonly');
    let result: AppState | null = null;
    let failure: Error | null = null;
    const manifestRequest = transaction.objectStore('state').get('library');
    manifestRequest.onsuccess = () => {
      const manifest = manifestRequest.result as Manifest | undefined;
      if (!manifest) return;
      if (manifest.version !== 1 || !Array.isArray(manifest.books) || !manifest.settings) {
        failure = new Error('La bibliothèque enregistrée est illisible.');
        transaction.abort();
        return;
      }
      result = { books: new Array(manifest.books.length), settings: manifest.settings };
      manifest.books.forEach((metadata, index) => {
        const request = transaction.objectStore('books').get(metadata.id);
        request.onsuccess = () => {
          const content = request.result as BookContent | undefined;
          if (!content || !Array.isArray(content.chapters) || !content.chapters.length) {
            failure = new Error('Un livre enregistré est illisible. Vos fichiers EPUB d’origine ne sont pas modifiés.');
            transaction.abort();
            return;
          }
          result!.books[index] = { ...metadata, ...content };
        };
      });
    };
    transaction.oncomplete = () => {
      result?.books.forEach((book) => savedContent.set(book.id, book.chapters));
      resolve(result);
    };
    transaction.onerror = () => reject(failure ?? new Error('Impossible de lire la bibliothèque locale.'));
    transaction.onabort = () => reject(failure ?? new Error('Impossible de lire la bibliothèque locale.'));
  });
}

async function persist(state: AppState): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(['state', 'books'], 'readwrite');
    const bookStore = transaction.objectStore('books');
    const books: BookMetadata[] = state.books.map((book) => {
      const { chapters, cover, ...metadata } = book;
      if (savedContent.get(book.id) !== chapters) {
        bookStore.put({ chapters, cover }, book.id);
      } else {
        // Another tab may have removed a book after this tab loaded it. An
        // unchanged in-memory reference is not proof that its record remains.
        const exists = bookStore.getKey(book.id);
        exists.onsuccess = () => {
          if (exists.result === undefined) bookStore.put({ chapters, cover }, book.id);
        };
      }
      return metadata;
    });
    const retained = new Set(books.map((book) => book.id));
    for (const id of savedContent.keys()) if (!retained.has(id)) bookStore.delete(id);
    const manifest: Manifest = { version: 1, books, settings: state.settings };
    transaction.objectStore('state').put(manifest, 'library');
    transaction.oncomplete = () => {
      savedContent.clear();
      state.books.forEach((book) => savedContent.set(book.id, book.chapters));
      resolve();
    };
    transaction.onerror = () => reject(new Error('Impossible d’enregistrer la bibliothèque. Le stockage du navigateur est peut-être plein.'));
    transaction.onabort = () => reject(new Error('L’enregistrement a été interrompu. Vérifiez l’espace disponible dans le navigateur.'));
  });
}

export function saveState(state: AppState): Promise<void> {
  const result = queue.catch(() => undefined).then(() => persist(state));
  queue = result;
  return result;
}
