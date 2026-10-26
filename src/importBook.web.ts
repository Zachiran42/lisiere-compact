import { parseEpub } from './epub';
import type { LibraryBook } from './types';

const MAX_BYTES = 40 * 1024 * 1024;

function fingerprint(bytes: Uint8Array): string {
  let first = 2166136261;
  let second = 5381;
  for (let index = 0; index < bytes.length; index++) {
    first = Math.imul(first ^ bytes[index], 16777619);
    second = Math.imul(second, 33) ^ bytes[index];
  }
  return `epub-${bytes.length.toString(36)}-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}

function chooseFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.epub,application/epub+zip';
    input.style.display = 'none';
    document.body.appendChild(input);
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (file: File | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      input.remove();
      resolve(file);
    };
    const onFocus = () => {
      // Older browsers do not emit the file input's cancel event.
      timer = setTimeout(() => finish(input.files?.[0] ?? null), 800);
    };
    input.addEventListener('change', () => finish(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => finish(null), { once: true });
    window.addEventListener('focus', onFocus, { once: true });
    input.click();
  });
}

export async function pickEpub(): Promise<LibraryBook | null> {
  const file = await chooseFile();
  if (!file) return null;
  if (!/\.epub$/i.test(file.name)) throw new Error('Choisissez un fichier au format .epub.');
  if (file.size > MAX_BYTES) throw new Error('Ce livre dépasse la limite de 40 Mo.');
  const bytes = new Uint8Array(await file.arrayBuffer()
    .catch(() => { throw new Error('Impossible de lire ce fichier. Sélectionnez-le à nouveau.'); }));
  const parsed = await parseEpub(bytes);
  return {
    ...parsed, id: fingerprint(bytes), addedAt: Date.now(), chapterIndex: 0, scroll: 0,
    favorite: false, finished: false, bookmarks: [], accent: '#365B48',
  };
}
