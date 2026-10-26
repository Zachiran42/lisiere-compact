import JSZip from 'jszip';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { DomUtils, Parser, parseDocument } from 'htmlparser2';
import type { EpubChapter, ParsedBook } from './types';
import { decodeText, encodeBase64 } from './bytes';

export type { EpubChapter, ParsedBook } from './types';

type HtmlNode = ReturnType<typeof parseDocument>['children'][number];
type XmlRecord = Record<string, unknown>;

// JSZip 3.10 implements this browser-compatible streaming method on each file,
// but omits it from JSZipObject's published declaration. Keep the assertion
// localized and check it at runtime instead of buffering entry.async() output.
interface StreamingZipEntry extends JSZip.JSZipObject {
  internalStream(type: 'uint8array'): JSZip.JSZipStreamHelper<Uint8Array>;
}

function supportsStreaming(entry: JSZip.JSZipObject): entry is StreamingZipEntry {
  return 'internalStream' in entry && typeof entry.internalStream === 'function';
}

const MAX_ARCHIVE_BYTES = 40 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 100 * 1024 * 1024;
const MAX_ENTRY_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_BYTES = 5 * 1024 * 1024;
const MAX_EMBEDDED_BYTES = 35 * 1024 * 1024;
const MAX_RENDERED_CHARACTERS = 60 * 1024 * 1024;
const MAX_ENTRIES = 5000;

const rasterTypes: Record<string, string> = {
  'image/jpeg': 'image/jpeg', 'image/png': 'image/png',
  'image/gif': 'image/gif', 'image/webp': 'image/webp',
  'image/avif': 'image/avif', 'image/bmp': 'image/bmp',
};
const extensionTypes: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp',
};

/** Check the ZIP central directory before JSZip inflates any archive member. */
function checkArchive(bytes: Uint8Array): void {
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error('Ce livre est trop volumineux (40 Mo maximum).');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50 &&
      offset + 22 + view.getUint16(offset + 20, true) === bytes.length) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error('Ce fichier n’est pas un EPUB valide.');
  const entries = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  let cursor = view.getUint32(end + 16, true);
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) ||
    view.getUint16(end + 8, true) !== entries || entries === 0xffff ||
    entries > MAX_ENTRIES || cursor + directorySize > end) {
    throw new Error('Le format de cette archive EPUB n’est pas pris en charge.');
  }
  const directoryEnd = cursor + directorySize;
  let expanded = 0;
  for (let i = 0; i < entries; i++) {
    if (cursor + 46 > directoryEnd || view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error('L’archive EPUB est endommagée.');
    }
    const size = view.getUint32(cursor + 24, true);
    expanded += size;
    if (size > MAX_ENTRY_BYTES || expanded > MAX_EXPANDED_BYTES) {
      throw new Error('Ce livre contient trop de données décompressées (100 Mo maximum).');
    }
    if (view.getUint16(cursor + 8, true) & 1) {
      throw new Error('Ce livre est chiffré. Importez un EPUB sans protection DRM.');
    }
    cursor += 46 + view.getUint16(cursor + 28, true) +
      view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
    if (cursor > directoryEnd) throw new Error('L’archive EPUB est endommagée.');
  }
  if (cursor !== directoryEnd) throw new Error('L’archive EPUB est endommagée.');
}

function record(value: unknown): XmlRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as XmlRecord : {};
}

function array(value: unknown): unknown[] {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}

function valueText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return valueText(record(value)['#text'] ?? '');
}

function checkMarkupLimits(source: string, xmlMode = false): void {
  let depth = 0;
  let nodes = 0;
  const count = () => {
    if (++nodes > 100000 || depth > 80) throw new Error('La structure de ce livre est trop complexe.');
  };
  const parser = new Parser({
    onopentag() { depth++; count(); },
    onclosetag() { depth = Math.max(0, depth - 1); },
    ontext: count,
    oncomment: count,
  }, { xmlMode, decodeEntities: true });
  parser.end(source);
}

function parseMarkup(source: string, xmlMode = false): ReturnType<typeof parseDocument> {
  // Bound the tree before allocating DOM nodes, not only when serializing it.
  checkMarkupLimits(source, xmlMode);
  return parseDocument(source, { xmlMode, decodeEntities: true });
}

function parseXml(source: string): XmlRecord {
  // EPUB package documents do not need DTDs or entity declarations.
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) {
    throw new Error('Les métadonnées de ce livre sont invalides.');
  }
  checkMarkupLimits(source, true);
  if (XMLValidator.validate(source) !== true) {
    throw new Error('Les métadonnées de ce livre sont invalides.');
  }
  const parser = new XMLParser({
    ignoreAttributes: false, removeNSPrefix: true,
    parseTagValue: false, parseAttributeValue: false, trimValues: true,
  });
  return record(parser.parse(source));
}

function decodePath(path: string): string {
  try { return decodeURIComponent(path); } catch { return path; }
}

/** Resolve a URL reference without allowing absolute URLs or archive escapes. */
function resolvePath(baseFile: string, reference: string): string | undefined {
  if (!reference) return undefined;
  const path = decodePath(reference.split('#')[0].split('?')[0]);
  if (!path) return baseFile || undefined;
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('/') || path.includes('\\') || /[\u0000-\u001f]/.test(path)) {
    return undefined;
  }
  const base = baseFile.split('/');
  base.pop();
  for (const part of path.split('/')) {
    if (part === '..') {
      if (!base.length) return undefined;
      base.pop();
    } else if (part && part !== '.') {
      base.push(part);
    }
  }
  return base.join('/');
}

function localName(name: string): string {
  return name.split(':').pop()!.toLowerCase();
}

function elements(nodes: HtmlNode[], tag: string): ReturnType<typeof DomUtils.getElementsByTagName> {
  return DomUtils.findAll(node => localName(node.name) === tag, nodes);
}

function textOf(node: HtmlNode): string {
  return DomUtils.textContent(node).replace(/\s+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

interface ManifestItem {
  id: string;
  path: string;
  type: string;
  properties: string[];
}

const allowedTags = new Set([
  'p', 'div', 'span', 'section', 'article', 'header', 'footer', 'main', 'aside',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'hr', 'strong', 'b', 'em', 'i',
  'u', 's', 'small', 'sub', 'sup', 'blockquote', 'q', 'cite', 'abbr', 'address',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'pre', 'code', 'kbd', 'samp', 'var',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'figure', 'figcaption', 'ruby', 'rt', 'rp', 'a', 'img', 'mark', 'del', 'ins',
]);
const blockedSubtrees = new Set([
  'script', 'style', 'head', 'iframe', 'object', 'embed', 'form', 'input', 'button',
  'select', 'textarea', 'video', 'audio', 'source', 'track', 'canvas', 'svg', 'math',
  'link', 'meta', 'base', 'applet', 'frame', 'frameset', 'template', 'noscript',
]);
const voidTags = new Set(['br', 'hr', 'img', 'col']);

async function sanitizeChapter(
  source: string,
  chapterPath: string,
  imageData: (path: string) => Promise<string | undefined>,
  accountOutput: (characters: number) => void,
): Promise<{ html: string; heading: string }> {
  const document = parseMarkup(source);
  const body = elements(document.children, 'body')[0];
  const roots = body ? body.children : document.children;
  const heading = ['h1', 'h2', 'h3'].map(tag => elements(roots, tag)[0]).find(Boolean);
  let nodeCount = 0;

  async function render(node: HtmlNode, depth: number): Promise<string> {
    if (++nodeCount > 100000 || depth > 80) {
      throw new Error('La structure de ce chapitre est trop complexe.');
    }
    if (node.type === 'text') {
      const text = escapeHtml(node.data);
      accountOutput(text.length);
      return text;
    }
    if (!DomUtils.isTag(node)) return '';
    const tag = localName(node.name);
    if (blockedSubtrees.has(tag)) return '';
    if (!allowedTags.has(tag)) {
      const children: string[] = [];
      for (const child of node.children) children.push(await render(child, depth + 1));
      return children.join('');
    }

    const attrs: string[] = [];
    for (const name of ['id', 'title', 'lang', 'dir']) {
      const value = node.attribs[name];
      if (value && value.length < 500) attrs.push(`${name}="${escapeHtml(value)}"`);
    }
    for (const name of ['colspan', 'rowspan', 'start', 'value']) {
      const value = node.attribs[name];
      if (value && /^-?\d{1,4}$/.test(value)) attrs.push(`${name}="${value}"`);
    }
    if (tag === 'img') {
      const imagePath = resolvePath(chapterPath, node.attribs.src ?? '');
      const image = imagePath && await imageData(imagePath);
      if (!image) {
        const alternative = node.attribs.alt ? `<span>${escapeHtml(node.attribs.alt)}</span>` : '';
        accountOutput(alternative.length);
        return alternative;
      }
      attrs.push(`src="${image}"`, `alt="${escapeHtml(node.attribs.alt ?? '')}"`);
    }
    if (tag === 'a') {
      const href = node.attribs.href ?? '';
      const target = resolvePath(chapterPath, href);
      const hashIndex = href.indexOf('#');
      const hash = hashIndex < 0 ? '' : href.slice(hashIndex);
      if (target === chapterPath && hash) attrs.push(`href="${escapeHtml(hash)}"`);
      else if (target) attrs.push(`data-epub-href="${escapeHtml(target + hash)}"`);
    }
    const opening = `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`;
    accountOutput(opening.length + (voidTags.has(tag) ? 0 : tag.length + 3));
    if (voidTags.has(tag)) return opening;
    const children: string[] = [];
    for (const child of node.children) children.push(await render(child, depth + 1));
    return `${opening}${children.join('')}</${tag}>`;
  }

  const output: string[] = [];
  for (const node of roots) output.push(await render(node, 0));
  return { html: output.join(''), heading: heading ? textOf(heading) : '' };
}

/** Import an EPUB 2 or 3 entirely on device. No resources are fetched remotely. */
export async function parseEpub(input: ArrayBuffer | Uint8Array): Promise<ParsedBook> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  checkArchive(bytes);
  let archive: JSZip;
  try {
    archive = await JSZip.loadAsync(bytes, { checkCRC32: false });
  } catch {
    throw new Error('Impossible d’ouvrir ce fichier. Choisissez un EPUB valide et non chiffré.');
  }

  let expandedBytes = 0;
  async function readBytes(path: string, maxBytes = MAX_ENTRY_BYTES): Promise<Uint8Array> {
    const entry = archive.file(path);
    if (!entry) throw new Error(`Le livre est incomplet : ${path}.`);
    if (!supportsStreaming(entry)) throw new Error('Cette version du lecteur ZIP ne permet pas une lecture sécurisée.');
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      const stream = entry.internalStream('uint8array');
      let size = 0;
      let stopped = false;
      const fail = (error: Error) => {
        if (stopped) return;
        stopped = true;
        chunks.length = 0;
        stream.pause();
        reject(error);
      };
      stream.on('data', (chunk: Uint8Array) => {
        if (stopped) return;
        size += chunk.byteLength;
        expandedBytes += chunk.byteLength;
        if (size > maxBytes || expandedBytes > MAX_EXPANDED_BYTES) {
          fail(new Error('Ce livre contient trop de données décompressées pour être ouvert.'));
          return;
        }
        chunks.push(chunk);
      });
      stream.on('error', () => fail(new Error('L’archive EPUB est endommagée.')));
      stream.on('end', () => {
        if (stopped) return;
        stopped = true;
        const result = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
        resolve(result);
      });
      stream.resume();
    });
  }

  async function readText(path: string): Promise<string> {
    return decodeText(await readBytes(path, MAX_TEXT_BYTES));
  }

  const mime = archive.file('mimetype');
  if (mime && decodeText(await readBytes('mimetype', 128)).trim() !== 'application/epub+zip') {
    throw new Error('Ce fichier n’est pas au format EPUB.');
  }
  const containerEntry = archive.file('META-INF/container.xml');
  if (!containerEntry) throw new Error('Ce fichier n’est pas un EPUB valide (container.xml absent).');
  const container = parseXml(await readText('META-INF/container.xml'));
  const rootfiles = array(record(record(container.container).rootfiles).rootfile);
  const rootfile = rootfiles.map(record).find(item => item['@_media-type'] === 'application/oebps-package+xml') ?? record(rootfiles[0]);
  const packagePath = resolvePath('', valueText(rootfile['@_full-path']));
  if (!packagePath) throw new Error('La structure de ce livre EPUB est invalide.');

  if (archive.file('META-INF/encryption.xml')) {
    const encryptionSource = await readText('META-INF/encryption.xml');
    parseXml(encryptionSource);
    const encryption = parseMarkup(encryptionSource, true);
    const methods = elements(encryption.children, 'encryptionmethod');
    const allowedAlgorithms = new Set([
      'http://www.idpf.org/2008/embedding', 'http://ns.adobe.com/pdf/enc#RC',
    ]);
    if (!methods.length || methods.some(method => !allowedAlgorithms.has(method.attribs.Algorithm ?? method.attribs.algorithm ?? ''))) {
      throw new Error('Ce livre est protégé par DRM. Importez un EPUB sans protection DRM.');
    }
  }

  const pkg = record(parseXml(await readText(packagePath)).package);
  const metadata = record(pkg.metadata);
  const renditionLayout = array(metadata.meta).map(record).find(meta => meta['@_property'] === 'rendition:layout');
  if (valueText(renditionLayout) === 'pre-paginated') {
    throw new Error('Les EPUB à mise en page fixe ne sont pas encore pris en charge. Choisissez un EPUB à texte adaptable.');
  }
  const manifest = array(record(pkg.manifest).item).map(record).flatMap(item => {
    const path = resolvePath(packagePath, valueText(item['@_href']));
    const id = valueText(item['@_id']);
    if (!path || !id) return [];
    return [{ id, path, type: valueText(item['@_media-type']), properties: valueText(item['@_properties']).split(/\s+/) }];
  });
  const byId = new Map<string, ManifestItem>(manifest.map(item => [item.id, item]));
  const byPath = new Map<string, ManifestItem>(manifest.map(item => [item.path, item]));
  const spine = array(record(pkg.spine).itemref).map(record).map(item => byId.get(valueText(item['@_idref'])));
  if (!spine.length || spine.some(item => !item)) throw new Error('La liste des chapitres de ce livre est absente ou endommagée.');
  const readable = spine.filter((item): item is ManifestItem => !!item && ['application/xhtml+xml', 'text/html'].includes(item.type));
  if (!readable.length) throw new Error('Ce livre ne contient aucun chapitre EPUB lisible.');
  if (readable.length !== spine.length) {
    throw new Error('Certains chapitres utilisent un format non pris en charge. Choisissez un EPUB à texte adaptable.');
  }

  const labels = new Map<string, string>();
  const nav = manifest.find(item => item.properties.includes('nav'));
  if (nav && archive.file(nav.path)) {
    const document = parseMarkup(await readText(nav.path));
    const navigation = elements(document.children, 'nav');
    const toc = navigation.find(item => (item.attribs['epub:type'] ?? '').split(/\s+/).includes('toc')) ?? navigation[0];
    for (const anchor of elements(toc ? toc.children : document.children, 'a')) {
      const path = resolvePath(nav.path, anchor.attribs.href ?? '');
      if (path && !labels.has(path) && textOf(anchor)) labels.set(path, textOf(anchor));
    }
  }
  if (!labels.size) {
    const ncx = byId.get(valueText(record(pkg.spine)['@_toc'])) ?? manifest.find(item => item.type === 'application/x-dtbncx+xml');
    if (ncx && archive.file(ncx.path)) {
      const document = parseMarkup(await readText(ncx.path), true);
      for (const point of elements(document.children, 'navpoint')) {
        const content = point.children.find(node => DomUtils.isTag(node) && localName(node.name) === 'content');
        const label = point.children.find(node => DomUtils.isTag(node) && localName(node.name) === 'navlabel');
        if (content && DomUtils.isTag(content) && label) {
          const path = resolvePath(ncx.path, content.attribs.src ?? '');
          if (path && !labels.has(path)) labels.set(path, textOf(label));
        }
      }
    }
  }

  const images = new Map<string, Promise<string | undefined>>();
  let embeddedBytes = 0;
  const imageData = (path: string): Promise<string | undefined> => {
    if (images.has(path)) return images.get(path)!;
    const promise = (async () => {
      const entry = archive.file(path);
      const declaredType = byPath.get(path)?.type;
      const type = declaredType ? rasterTypes[declaredType] : extensionTypes[path.split('.').pop()?.toLowerCase() ?? ''];
      if (!entry || !type) return undefined;
      const data = await readBytes(path);
      embeddedBytes += data.byteLength;
      if (embeddedBytes > MAX_EMBEDDED_BYTES) throw new Error('Les images de ce livre sont trop volumineuses (35 Mo maximum).');
      return `data:${type};base64,${encodeBase64(data)}`;
    })();
    images.set(path, promise);
    return promise;
  };

  const coverMeta = array(metadata.meta).map(record).find(meta => meta['@_name'] === 'cover');
  const coverItem = manifest.find(item => item.properties.includes('cover-image')) ?? byId.get(valueText(coverMeta?.['@_content']));
  let cover = coverItem ? await imageData(coverItem.path) : undefined;
  if (!cover) {
    const coverRef = array(record(pkg.guide).reference).map(record).find(item => item['@_type'] === 'cover');
    const path = resolvePath(packagePath, valueText(coverRef?.['@_href']));
    if (path && archive.file(path) && byPath.get(path)?.type === 'application/xhtml+xml') {
      const coverDocument = parseMarkup(await readText(path));
      const image = elements(coverDocument.children, 'img')[0];
      const imagePath = image && resolvePath(path, image.attribs.src ?? '');
      if (imagePath) cover = await imageData(imagePath);
    }
  }

  const chapters: EpubChapter[] = [];
  let renderedCharacters = cover?.length ?? 0;
  const accountOutput = (characters: number): void => {
    renderedCharacters += characters;
    if (renderedCharacters > MAX_RENDERED_CHARACTERS) {
      throw new Error('Le contenu de ce livre est trop volumineux pour être affiché.');
    }
  };
  for (let i = 0; i < readable.length; i++) {
    const item = readable[i];
    const sanitized = await sanitizeChapter(await readText(item.path), item.path, imageData, accountOutput);
    chapters.push({
      id: `${item.id}-${i}`, href: item.path,
      title: labels.get(item.path) || sanitized.heading || `Chapitre ${i + 1}`,
      html: sanitized.html,
    });
  }

  return {
    title: valueText(array(metadata.title)[0]) || 'Livre sans titre',
    author: array(metadata.creator).map(valueText).filter(Boolean).join(', ') || 'Auteur inconnu',
    language: valueText(array(metadata.language)[0]) || 'fr',
    ...(cover ? { cover } : {}),
    chapters,
  };
}
