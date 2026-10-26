/* SPDX-License-Identifier: MIT — Lisière Compact, Copyright (c) 2026 Zachiran42. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LisiereImportTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var MAX_BYTES = 40 * 1024 * 1024;
  function fingerprint(bytes) {
    var first = 2166136261, second = 5381;
    for (var index = 0; index < bytes.length; index++) {
      first = Math.imul(first ^ bytes[index], 16777619);
      second = Math.imul(second, 33) ^ bytes[index];
    }
    return 'epub-' + bytes.length.toString(36) + '-' + (first >>> 0).toString(36) + '-' + (second >>> 0).toString(36);
  }
  async function importBytes(bytes, parseEpub) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    if (bytes.length > MAX_BYTES) throw new Error('Ce livre dépasse la limite de 40 Mo.');
    var parsed = await parseEpub(bytes);
    return Object.assign({}, parsed, { id: fingerprint(bytes), addedAt: Date.now(), chapterIndex: 0, scroll: 0,
      favorite: false, finished: false, bookmarks: [], accent: '#365B48' });
  }
  async function importFiles(files, parseEpub) {
    var result = { books: [], errors: [], total: files.length };
    for (var file of files) {
      try {
        if (!/\.epub$/i.test(file.name)) throw new Error('Ce fichier n’est pas au format EPUB.');
        if (file.size > MAX_BYTES) throw new Error('Ce livre dépasse la limite de 40 Mo.');
        var bytes = new Uint8Array(await file.arrayBuffer());
        result.books.push(await importBytes(bytes, parseEpub));
      } catch (error) {
        result.errors.push({ name: String(file.name || 'Fichier EPUB'), message: error instanceof Error ? error.message : 'Impossible de lire ce fichier.' });
      }
    }
    return result;
  }
  function chooseFiles() {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file'; input.accept = '.epub,application/epub+zip'; input.multiple = true;
      input.style.display = 'none'; document.body.appendChild(input);
      var finished = false, timer;
      function finish(files) {
        if (finished) return; finished = true;
        clearTimeout(timer); window.removeEventListener('focus', onFocus); input.remove(); resolve(files);
      }
      function selected() { return input.files && input.files.length ? Array.from(input.files) : null; }
      function onFocus() { timer = setTimeout(function () { finish(selected()); }, 800); }
      input.addEventListener('change', function () { finish(selected()); }, { once: true });
      input.addEventListener('cancel', function () { finish(null); }, { once: true });
      window.addEventListener('focus', onFocus, { once: true }); input.click();
    });
  }
  async function pickEpubs(parseEpub) {
    var files = await chooseFiles();
    return files ? importFiles(files, parseEpub) : null;
  }
  function mergeBooks(existing, result) {
    var seen = new Set(existing.map(function (book) { return book.id; }));
    var additions = [], duplicates = 0;
    for (var book of result.books) {
      if (seen.has(book.id)) duplicates++;
      else { seen.add(book.id); additions.push(book); }
    }
    return { books: additions.concat(existing), added: additions.length, duplicates: duplicates,
      errors: result.errors || [], total: result.total == null ? result.books.length + (result.errors || []).length : result.total,
      title: result.books[0] ? result.books[0].title : '' };
  }
  return { MAX_BYTES: MAX_BYTES, fingerprint: fingerprint, importBytes: importBytes, importFiles: importFiles,
    chooseFiles: chooseFiles, pickEpubs: pickEpubs, mergeBooks: mergeBooks };
});
