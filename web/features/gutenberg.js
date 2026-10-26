/* SPDX-License-Identifier: MIT — Lisière Compact, Copyright (c) 2026 Zachiran42. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LisiereGutenberg = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var ORIGIN = 'https://www.gutenberg.org';
  function validateUrl(value, base) {
    var url = new URL(value, base || ORIGIN);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      ['www.gutenberg.org', 'gutenberg.org'].indexOf(url.hostname) < 0 ||
      !(/^\/ebooks\/search\.opds\/?$/.test(url.pathname) || /^\/ebooks\/\d+\.opds$/.test(url.pathname) ||
        /^\/ebooks\/\d+\.epub(?:3)?\.(?:images|noimages)$/.test(url.pathname) ||
        /^\/cache\/epub\/\d+\/[A-Za-z0-9._-]+\.epub$/.test(url.pathname))) {
      throw new Error('Lien Gutenberg non autorisé.');
    }
    if (url.pathname.indexOf('search.opds') < 0 && url.search) throw new Error('Lien Gutenberg non autorisé.');
    url.hash = ''; return url.href;
  }
  function searchUrl(query, language) {
    var terms = String(query || '').replace(/[\x00-\x1f]/g, '').trim().slice(0, 180);
    if (language && !/^[a-z]{2}$/.test(language)) throw new Error('Langue non prise en charge.');
    var url = new URL('/ebooks/search.opds/', ORIGIN);
    url.searchParams.set('query', (language ? 'l.' + language + ' ' : '') + terms);
    url.searchParams.set('sort_order', 'downloads'); return url.href;
  }
  function parseFeed(xml, base, Parser) {
    if (xml.length > 2 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Catalogue Gutenberg invalide.');
    var doc = new (Parser || DOMParser)().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length || doc.documentElement.localName !== 'feed') throw new Error('Le catalogue Gutenberg est momentanément indisponible.');
    function children(node, name) { return Array.from(node.children || []).filter(function (child) { return child.localName === name; }); }
    function text(node, name) { var child = children(node, name)[0]; return child ? child.textContent.trim() : ''; }
    function links(node) { return children(node, 'link').map(function (link) { return { href: link.getAttribute('href') || '', rel: link.getAttribute('rel') || '', type: link.getAttribute('type') || '', length: Number(link.getAttribute('length')) || 0 }; }); }
    var entries = [], acquisition = [];
    for (var entry of children(doc.documentElement, 'entry')) {
      var title = text(entry, 'title'), entryLinks = links(entry);
      var subsection = entryLinks.find(function (link) { return /^\/ebooks\/\d+\.opds$/.test(new URL(link.href, base).pathname); });
      if (subsection) {
        var detailUrl = validateUrl(subsection.href, base), id = Number(new URL(detailUrl).pathname.match(/\d+/)[0]);
        var description = text(entry, 'content');
        entries.push({ id: id, title: title, author: /^\d+ downloads$/i.test(description) ? 'Auteur non précisé' : description || 'Auteur non précisé', detailUrl: detailUrl });
      }
      var authors = children(entry, 'author').map(function (author) { return text(author, 'name'); }).filter(Boolean);
      for (var link of entryLinks) {
        if (link.type !== 'application/epub+zip' || link.rel.indexOf('acquisition') < 0) continue;
        acquisition.push({ title: title, authors: authors, rights: text(entry, 'rights'), url: validateUrl(link.href, base), length: link.length });
      }
    }
    acquisition.sort(function (a, b) {
      function rank(item) { return item.url.indexOf('.epub3.images') >= 0 ? 0 : item.url.indexOf('.epub.images') >= 0 ? 1 : 2; }
      return rank(a) - rank(b);
    });
    var feedLinks = links(doc.documentElement);
    function page(rel) { var link = feedLinks.find(function (value) { return value.rel === rel; }); return link ? validateUrl(link.href, base) : null; }
    return { entries: entries, next: page('next'), previous: page('previous'), acquisition: acquisition[0] || null };
  }
  async function boundedBytes(response, limit, signal) {
    if (!response.ok) throw new Error(response.status === 429 ? 'Gutenberg reçoit trop de demandes. Réessayez dans un instant.' : 'Impossible de joindre Gutenberg. Vérifiez votre connexion et réessayez.');
    if (Number(response.headers.get('content-length')) > limit) throw new Error('Ce téléchargement est trop volumineux.');
    if (!response.body || !response.body.getReader) {
      var bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > limit) throw new Error('Ce téléchargement est trop volumineux.');
      return bytes;
    }
    var reader = response.body.getReader(), chunks = [], size = 0;
    try {
      while (true) {
        if (signal && signal.aborted) throw new DOMException('Annulé', 'AbortError');
        var part = await reader.read(); if (part.done) break;
        size += part.value.length;
        if (size > limit) throw new Error('Ce téléchargement est trop volumineux.');
        chunks.push(part.value);
      }
    } catch (error) { await reader.cancel().catch(function () {}); throw error; }
    var output = new Uint8Array(size), offset = 0;
    chunks.forEach(function (chunk) { output.set(chunk, offset); offset += chunk.length; }); return output;
  }
  async function fetchResource(url, signal, limit) {
    url = validateUrl(url);
    var proxy = '/gutenberg?url=' + encodeURIComponent(url);
    var response = await fetch(proxy, { signal: signal, credentials: 'omit', cache: 'no-store' });
    return boundedBytes(response, limit, signal);
  }
  async function fetchFeed(url, signal) { return parseFeed(new TextDecoder('utf-8').decode(await fetchResource(url, signal, 2 * 1024 * 1024)), url); }
  async function fetchEpub(url, signal) { return fetchResource(url, signal, 40 * 1024 * 1024); }
  return { validateUrl: validateUrl, searchUrl: searchUrl, parseFeed: parseFeed, boundedBytes: boundedBytes,
    fetchFeed: fetchFeed, fetchEpub: fetchEpub, ORIGIN: ORIGIN };
});
