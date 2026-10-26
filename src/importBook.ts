import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { parseEpub } from './epub';
import type { LibraryBook } from './types';

const MAX_BYTES = 40 * 1024 * 1024;

function decodeBase64(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const length = value.length / 4 * 3 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0);
  const bytes = new Uint8Array(length);
  let position = 0;
  for (let index = 0; index < value.length; index += 4) {
    const packed = (alphabet.indexOf(value[index]) << 18) | (alphabet.indexOf(value[index + 1]) << 12) |
      (Math.max(0, alphabet.indexOf(value[index + 2])) << 6) | Math.max(0, alphabet.indexOf(value[index + 3]));
    if (position < length) bytes[position++] = (packed >> 16) & 255;
    if (position < length) bytes[position++] = (packed >> 8) & 255;
    if (position < length) bytes[position++] = packed & 255;
  }
  return bytes;
}

function fingerprint(bytes: Uint8Array): string {
  let first = 2166136261;
  let second = 5381;
  for (let index = 0; index < bytes.length; index++) {
    first = Math.imul(first ^ bytes[index], 16777619);
    second = Math.imul(second, 33) ^ bytes[index];
  }
  return `epub-${bytes.length.toString(36)}-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}

export async function pickEpub(): Promise<LibraryBook | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false })
    .catch(() => { throw new Error('Impossible d’ouvrir le sélecteur de fichiers. Réessayez depuis la bibliothèque.'); });
  if (result.canceled) return null;
  const asset = result.assets[0];
  try {
    if (!asset || !/\.epub$/i.test(asset.name)) throw new Error('Choisissez un fichier au format .epub.');
    if ((asset.size ?? 0) > MAX_BYTES) throw new Error('Ce livre dépasse la limite de 40 Mo.');
    const info = await FileSystem.getInfoAsync(asset.uri);
    if (!info.exists || info.isDirectory) throw new Error('Le fichier choisi n’est plus accessible. Sélectionnez-le à nouveau.');
    if (info.size > MAX_BYTES) throw new Error('Ce livre dépasse la limite de 40 Mo.');
    const encoded = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 })
      .catch(() => { throw new Error('Impossible de lire ce fichier. Téléchargez-le sur votre appareil, puis réessayez.'); });
    if (encoded.length > Math.ceil(MAX_BYTES / 3) * 4) throw new Error('Ce livre dépasse la limite de 40 Mo.');
    const bytes = decodeBase64(encoded);
    if (bytes.length > MAX_BYTES) throw new Error('Ce livre dépasse la limite de 40 Mo.');
    const parsed = await parseEpub(bytes);
    return {
      ...parsed, id: fingerprint(bytes), addedAt: Date.now(), chapterIndex: 0, scroll: 0,
      favorite: false, finished: false, bookmarks: [], accent: '#365B48',
    };
  } finally {
    if (asset?.uri && FileSystem.cacheDirectory && asset.uri.startsWith(FileSystem.cacheDirectory)) {
      await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => undefined);
    }
  }
}
