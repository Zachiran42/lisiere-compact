// SPDX-License-Identifier: MIT
const test = require('node:test');
const assert = require('node:assert/strict');
const imports = require('../web/features/imports.js');
const pg = require('../web/features/gutenberg.js');
const file = (name, bytes, size = bytes.length) => ({ name, size, arrayBuffer: async () => Uint8Array.from(bytes).buffer });
test('batch keeps successful books after a bad EPUB and parses sequentially', async () => {
  let concurrent = 0;
  const result = await imports.importFiles([file('a.epub', [1]), file('bad.epub', [0]), file('b.EPUB', [2])], async bytes => {
    assert.equal(++concurrent, 1); await new Promise(resolve => setImmediate(resolve)); concurrent--;
    if (!bytes[0]) throw Error('Archive invalide'); return { title: 'Livre ' + bytes[0], chapters: [] };
  });
  assert.equal(result.total, 3); assert.deepEqual(result.books.map(book => book.title), ['Livre 1', 'Livre 2']);
  assert.deepEqual(result.errors, [{ name: 'bad.epub', message: 'Archive invalide' }]);
});
test('same bytes deduplicate within a batch and against the library without resetting progress', () => {
  const id = imports.fingerprint(Uint8Array.of(1, 2, 3));
  const existing = { id, chapterIndex: 4, scroll: .7, favorite: true };
  const added = { id: 'new', title: 'Nouveau' };
  const merged = imports.mergeBooks([existing], { books: [{ id }, added, added], errors: [], total: 3 });
  assert.equal(merged.added, 1); assert.equal(merged.duplicates, 2); assert.deepEqual(merged.books, [added, existing]);
  assert.equal(merged.books[1], existing);
});
test('oversized and non EPUB inputs fail independently without reading bytes', async () => {
  const invalid = { name: 'large.epub', size: imports.MAX_BYTES + 1, arrayBuffer: () => { throw Error('Must not read'); } };
  const result = await imports.importFiles([invalid, file('book.pdf', [1])], () => { throw Error('Must not parse'); });
  assert.equal(result.books.length, 0); assert.equal(result.errors.length, 2); assert.match(result.errors[0].message, /40 Mo/);
});
test('search uses the actual OPDS language filter and safely encodes terms', () => {
  const url = new URL(pg.searchUrl('Dumas & Hugo', 'fr'));
  assert.equal(url.searchParams.get('query'), 'l.fr Dumas & Hugo'); assert.equal(url.searchParams.get('sort_order'), 'downloads');
  assert.equal(new URL(pg.searchUrl('Candide', '')).searchParams.get('query'), 'Candide');
});
test('transport rejects arbitrary hosts, credentials, ports, encoded paths and query on downloads', () => {
  for (const value of ['http://www.gutenberg.org/ebooks/1.opds', 'https://evil.test/ebooks/1.opds', 'https://www.gutenberg.org.evil.test/ebooks/1.opds', 'https://u:p@www.gutenberg.org/ebooks/1.opds', 'https://www.gutenberg.org:444/ebooks/1.opds', 'https://www.gutenberg.org/%65books/1.opds', 'https://www.gutenberg.org/ebooks/1.epub.images?x=y', 'https://www.gutenberg.org/policy/privacy_policy.html']) assert.throws(() => pg.validateUrl(value), Error, value);
  assert.equal(pg.validateUrl('/ebooks/17989.epub3.images'), 'https://www.gutenberg.org/ebooks/17989.epub3.images');
  assert.equal(pg.validateUrl('/cache/epub/17989/pg17989-images-3.epub'), 'https://www.gutenberg.org/cache/epub/17989/pg17989-images-3.epub');
});
test('bounded download refuses declared length and streaming overflow', async () => {
  await assert.rejects(pg.boundedBytes(new Response('12345', { headers: { 'content-length': '999' } }), 4), /volumineux/);
  await assert.rejects(pg.boundedBytes(new Response(new ReadableStream({ start(c) { c.enqueue(Uint8Array.of(1,2,3)); c.enqueue(Uint8Array.of(4,5)); c.close(); } })), 4), /volumineux/);
  assert.deepEqual(await pg.boundedBytes(new Response('abc'), 4), new TextEncoder().encode('abc'));
});
test('HTTP errors and cancellation do not return partial bytes', async () => {
  await assert.rejects(pg.boundedBytes(new Response('', { status: 429 }), 10), /trop de demandes/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(pg.boundedBytes(new Response('abc'), 10, controller.signal), { name: 'AbortError' });
});
