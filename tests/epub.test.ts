import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { parseEpub } from '../src/epub/index';
import { decodeText, encodeBase64 } from '../src/epub/bytes';

const container = `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;

interface FixtureOptions {
  opf?: string;
  files?: Record<string, string | Uint8Array>;
  skipContainer?: boolean;
}

const defaultOpf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="id">test-lisiere</dc:identifier>
    <dc:title>Un &amp; deux</dc:title><dc:creator>Une Autrice</dc:creator><dc:language>fr</dc:language>
  </metadata>
  <manifest>
    <item id="second" href="Text/second.xhtml" media-type="application/xhtml+xml"/>
    <item id="first" href="Text/first.xhtml" media-type="application/xhtml+xml"/>
    <item id="navigation" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="cover" href="Images/cover.png" media-type="image/png" properties="cover-image"/>
  </manifest>
  <spine><itemref idref="first"/><itemref idref="second"/></spine>
</package>`;

async function fixture(options: FixtureOptions = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  if (!options.skipContainer) zip.file('META-INF/container.xml', container);
  zip.file('OPS/book.opf', options.opf ?? defaultOpf);
  zip.file('OPS/Text/first.xhtml', '<html><head><title>Ignored</title></head><body><h1>Première page</h1><p>Bonjour &amp; bienvenue.</p><img src="../Images/cover.png" alt="Illustration"/></body></html>');
  zip.file('OPS/Text/second.xhtml', '<html><body><h1>Deuxième page</h1><p>La suite.</p></body></html>');
  zip.file('OPS/nav.xhtml', '<html xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="Text/first.xhtml">Le départ</a></li><li><a href="Text/second.xhtml#part2">Le retour</a></li></ol></nav></body></html>');
  // Tiny binary fixture: the parser embeds bytes without trying to decode images.
  zip.file('OPS/Images/cover.png', new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
  for (const [path, contents] of Object.entries(options.files ?? {})) zip.file(path, contents);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

test('EPUB 3 preserves spine order, metadata, navigation labels and local images', async () => {
  const book = await parseEpub(await fixture());
  assert.equal(book.title, 'Un & deux');
  assert.equal(book.author, 'Une Autrice');
  assert.equal(book.language, 'fr');
  assert.deepEqual(book.chapters.map(chapter => chapter.href), ['OPS/Text/first.xhtml', 'OPS/Text/second.xhtml']);
  assert.deepEqual(book.chapters.map(chapter => chapter.title), ['Le départ', 'Le retour']);
  assert.match(book.cover!, /^data:image\/png;base64,/);
  assert.match(book.chapters[0].html, /Bonjour &amp; bienvenue/);
  assert.match(book.chapters[0].html, /src="data:image\/png;base64,/);
  assert.doesNotMatch(book.chapters[0].html, /<html|<head|<body|Ignored/);
});

test('EPUB 2 reads NCX labels and the metadata cover declaration', async () => {
  const opf = defaultOpf.replace('version="3.0"', 'version="2.0"')
    .replace('</metadata>', '<meta name="cover" content="cover"/></metadata>')
    .replace('properties="cover-image"', '')
    .replace('media-type="application/xhtml+xml" properties="nav"', 'media-type="application/x-dtbncx+xml"')
    .replace('href="nav.xhtml"', 'href="toc.ncx"')
    .replace('<spine>', '<spine toc="navigation">');
  const book = await parseEpub(await fixture({ opf, files: {
    'OPS/toc.ncx': '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"><navMap><navPoint id="a"><navLabel><text>Chapitre historique</text></navLabel><content src="Text/first.xhtml"/></navPoint></navMap></ncx>',
  } }));
  assert.equal(book.chapters[0].title, 'Chapitre historique');
  assert.equal(book.chapters[1].title, 'Deuxième page');
  assert.match(book.cover!, /^data:image\/png;base64,/);
});

test('sanitization removes executable HTML, styles, events and remote resources', async () => {
  const book = await parseEpub(await fixture({ files: {
    'OPS/Text/first.xhtml': `<html><body onload="steal()"><h1>Test</h1>
      <script>window.bad = true</script><style>@import 'https://example.org/tracker';</style>
      <iframe src="https://example.org"></iframe><svg onload="bad()"><script>bad()</script></svg>
      <p style="background:url(https://example.org)" onclick="bad()">Texte conservé</p>
      <img src="https://example.org/a.png" onerror="bad()" alt="Image distante"/>
      <img src="data:image/svg+xml,evil"/><img src="../../../outside.png"/>
      <a href="javascript:alert(1)">Lien</a><a href="https://example.org">Web</a>
      <a href="#note">Note</a><a href="second.xhtml#part2">Suite</a>
      <p id="note">Une note.</p><form action="https://example.org"><input name="secret"/></form>
    </body></html>`,
  } }));
  const html = book.chapters[0].html;
  assert.match(html, /Texte conservé/);
  assert.match(html, /Image distante/);
  assert.match(html, /href="#note"/);
  assert.match(html, /data-epub-href="OPS\/Text\/second.xhtml#part2"/);
  assert.doesNotMatch(html, /<script|<style|<iframe|<svg|<form|<input|onload=|onerror=|onclick=|style=|https:|javascript:|window\.bad|outside\.png/);
});

test('encrypted DRM produces a clear French error', async () => {
  const epub = await fixture({ files: {
    'META-INF/encryption.xml': '<encryption><EncryptedData><EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/></EncryptedData></encryption>',
  } });
  await assert.rejects(parseEpub(epub), /protégé par DRM/);
});

test('standard font obfuscation does not prevent reading unencrypted chapters', async () => {
  const epub = await fixture({ files: {
    'META-INF/encryption.xml': '<encryption><EncryptedData><EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/></EncryptedData></encryption>',
  } });
  assert.equal((await parseEpub(epub)).chapters.length, 2);
});

test('invalid files, missing package documents and broken spine are rejected', async () => {
  await assert.rejects(parseEpub(new Uint8Array([1, 2, 3])), /EPUB valide/);
  await assert.rejects(parseEpub(await fixture({ skipContainer: true })), /container.xml absent/);
  await assert.rejects(parseEpub(await fixture({ opf: defaultOpf.replace('idref="first"', 'idref="missing"') })), /chapitres.*endommagée/);
  await assert.rejects(parseEpub(await fixture({ files: { 'OPS/Text/first.xhtml': '<p>Valid</p>', 'OPS/book.opf': '<package><unclosed></package>' } })), /métadonnées.*invalides/);
});

test('external entities in package metadata are rejected', async () => {
  const opf = defaultOpf.replace('<?xml version="1.0"?>', '<?xml version="1.0"?><!DOCTYPE package [<!ENTITY ext SYSTEM "https://example.org/secret">]>');
  await assert.rejects(parseEpub(await fixture({ opf })), /métadonnées.*invalides/);
});

test('ZIP expansion limits are checked before an oversized entry is inflated', async () => {
  const bytes = await fixture();
  const edited = bytes.slice();
  const view = new DataView(edited.buffer);
  let changed = false;
  for (let offset = 0; offset < edited.length - 46; offset++) {
    if (view.getUint32(offset, true) === 0x02014b50) {
      view.setUint32(offset + 24, 101 * 1024 * 1024, true);
      changed = true;
      break;
    }
  }
  assert.equal(changed, true);
  await assert.rejects(parseEpub(edited), /données décompressées/);
});

test('encoded paths and HTML entities are resolved without making outside requests', async () => {
  const opf = defaultOpf.replaceAll('Text/first.xhtml', 'Text/premier%20chapitre.xhtml');
  const book = await parseEpub(await fixture({ opf, files: {
    'OPS/Text/premier chapitre.xhtml': '<html><body><h1>Été &amp; hiver</h1><p>&lt;script&gt; est du texte.</p><img src="../Images/cover.png"/></body></html>',
  } }));
  assert.equal(book.chapters[0].href, 'OPS/Text/premier chapitre.xhtml');
  assert.equal(book.chapters[0].title, 'Été & hiver');
  assert.match(book.chapters[0].html, /&lt;script&gt; est du texte/);
  assert.match(book.chapters[0].html, /data:image\/png;base64/);
});

test('an entry with a false size is stopped while streaming, before its full expansion', async () => {
  const bytes = await fixture({ files: { 'OPS/Text/first.xhtml': 'a'.repeat(6 * 1024 * 1024) } });
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset < bytes.length - 46; offset++) {
    if (view.getUint32(offset, true) !== 0x02014b50) continue;
    const nameLength = view.getUint16(offset + 28, true);
    if (decodeText(bytes.subarray(offset + 46, offset + 46 + nameLength)) === 'OPS/Text/first.xhtml') {
      view.setUint32(offset + 24, 100, true);
      break;
    }
  }
  await assert.rejects(parseEpub(bytes), /trop de données décompressées/);
});

test('fixed layout and SVG-only spine formats fail explicitly instead of losing pages', async () => {
  const fixed = defaultOpf.replace('</metadata>', '<meta property="rendition:layout">pre-paginated</meta></metadata>');
  await assert.rejects(parseEpub(await fixture({ opf: fixed })), /mise en page fixe/);
  const svgSpine = defaultOpf.replace('href="Text/first.xhtml" media-type="application/xhtml+xml"', 'href="Text/first.xhtml" media-type="image/svg+xml"');
  await assert.rejects(parseEpub(await fixture({ opf: svgSpine })), /format non pris en charge/);
});

test('deeply nested markup is rejected before constructing a large document tree', async () => {
  const source = `<html><body>${'<div>'.repeat(1000)}Texte${'</div>'.repeat(1000)}</body></html>`;
  await assert.rejects(parseEpub(await fixture({ files: { 'OPS/Text/first.xhtml': source } })), /structure.*trop complexe/);
});

test('portable codecs preserve French, supplementary Unicode, UTF-16 and base64 boundaries', () => {
  const sample = 'Été, cœur, 中文 et 🐱\n'.repeat(1000);
  assert.equal(decodeText(new TextEncoder().encode(sample)), sample);
  assert.equal(decodeText(new Uint8Array(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(sample, 'utf16le')]))), sample);
  for (const length of [0, 1, 2, 3, 17, 12289, 20000]) {
    const bytes = Uint8Array.from({ length }, (_, index) => index * 71 % 256);
    assert.equal(encodeBase64(bytes), Buffer.from(bytes).toString('base64'));
  }
});
