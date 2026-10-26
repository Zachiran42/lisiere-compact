/* SPDX-License-Identifier: MIT — Lisière Compact, Copyright (c) 2026 Zachiran42. */
(function () {
  'use strict';
  var active = null, api = window.LisiereGutenberg;
  var css = '.lf-backdrop{position:fixed;inset:0;background:#13261c75;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}.lf-dialog{background:#f8f7f2;color:#253b30;border-radius:20px;width:100%;max-width:680px;max-height:90dvh;display:flex;flex-direction:column;box-shadow:0 12px 60px #14261a33;font:15px/1.5 system-ui,sans-serif;overflow:hidden}.lf-head{display:flex;gap:16px;align-items:center;padding:20px 24px;border-bottom:1px solid #dedfd5}.lf-head h1{font:26px Georgia,serif;margin:0;flex:1}.lf-close{font-size:24px!important;min-width:42px}.lf-dialog button,.lf-dialog input,.lf-dialog select{font:inherit;box-sizing:border-box}.lf-dialog button{border:1px solid #cbd2c8;background:#fff;color:#234c3d;border-radius:10px;padding:9px 14px;cursor:pointer;min-height:42px}.lf-dialog button:disabled{opacity:.55;cursor:default}.lf-dialog button:focus-visible,.lf-dialog input:focus-visible,.lf-dialog select:focus-visible,.lf-dialog a:focus-visible{outline:3px solid #899e69;outline-offset:2px}.lf-dialog .lf-primary{background:#234c3d;color:white;border-color:#234c3d}.lf-scroll{overflow-y:auto;padding:20px 24px;overscroll-behavior:contain}.lf-search{display:flex;gap:10px;flex-wrap:wrap}.lf-query{flex:1 1 260px}.lf-dialog label{display:flex;flex-direction:column;gap:5px;font-size:13px}.lf-dialog input,.lf-dialog select{border:1px solid #cbd2c8;background:white;color:#253b30;border-radius:9px;padding:10px;min-height:44px;width:100%}.lf-search button{align-self:flex-end}.lf-note{font-size:12px;color:#637063;margin:14px 0}.lf-status{min-height:24px;margin:14px 0;white-space:pre-line}.lf-book{display:flex;gap:14px;padding:17px 0;border-top:1px solid #dedfd5;align-items:center}.lf-book-info{flex:1;min-width:0}.lf-book h2{font:19px/1.3 Georgia,serif;margin:0 0 4px;overflow-wrap:anywhere}.lf-book p{margin:0 0 5px;color:#637063;font-size:13px}.lf-book a{font-size:12px;color:#345b46}.lf-badge{width:34px;height:46px;border-radius:3px 7px 7px 3px;display:grid;place-items:center;background:#e0e7d6;color:#45613d;font-size:9px;font-weight:700;flex:none}.lf-pages{display:flex;gap:12px;justify-content:space-between;margin-top:15px}.lf-errors{padding-left:22px;overflow-wrap:anywhere}.lf-report p{margin:8px 0}.lf-report .lf-primary{margin-top:18px}@media(max-width:600px){.lf-backdrop{padding:0}.lf-dialog{max-height:100dvh;height:100dvh;border-radius:0}.lf-head{padding:16px}.lf-scroll{padding:16px}.lf-book{gap:10px}.lf-book button{padding:8px;font-size:12px}.lf-badge{display:none}.lf-head h1{font-size:24px}}';
  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'class') node.className = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    if (text != null) node.textContent = text;
    return node;
  }
  function button(text, action, cls) {
    var node = el('button', { type: 'button', class: cls || '' }, text); node.addEventListener('click', action); return node;
  }
  function dialog(title) {
    if (active) active.close();
    if (!document.getElementById('lisiere-features-style')) {
      var style = el('style', { id: 'lisiere-features-style' }, css); document.head.appendChild(style);
    }
    var previous = document.activeElement, backdrop = el('div', { class: 'lf-backdrop' });
    var box = el('section', { class: 'lf-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lf-title' });
    var header = el('div', { class: 'lf-head' }), heading = el('h1', { id: 'lf-title' }, title);
    var controller = new AbortController(), oldOverflow = document.body.style.overflow;
    var handle = { body: el('div', { class: 'lf-scroll' }), signal: controller.signal, close: close };
    function close() {
      controller.abort(); backdrop.remove(); document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', keys, true); window.removeEventListener('lisiere-native-back', back, true);
      if (active === handle) active = null;
      if (previous && previous.isConnected) previous.focus();
    }
    function back(event) { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    function keys(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
      if (event.key !== 'Tab') return;
      var nodes = Array.from(box.querySelectorAll('button:not(:disabled),input,select,a[href]')).filter(function (node) { return node.offsetParent !== null; });
      var first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    var dismiss = button('×', close, 'lf-close'); dismiss.setAttribute('aria-label', 'Fermer');
    header.append(heading, dismiss); box.append(header, handle.body); backdrop.appendChild(box); document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden'; window.addEventListener('keydown', keys, true); window.addEventListener('lisiere-native-back', back, true);
    active = handle; dismiss.focus(); return handle;
  }
  function openCatalogue(options) {
    var view = dialog('Livres gratuits'), busy = false, generation = 0, downloaded = new Map();
    var form = el('form', { class: 'lf-search' }), queryLabel = el('label', { class: 'lf-query' }, 'Titre ou auteur');
    var query = el('input', { type: 'search', placeholder: 'Hugo, Dumas, un titre…', maxlength: '180' }); queryLabel.appendChild(query);
    var languageLabel = el('label', {}, 'Langue'), language = el('select', { 'aria-label': 'Langue des livres' });
    [['fr', 'Français'], ['en', 'Anglais'], ['', 'Toutes']].forEach(function (pair) { language.appendChild(el('option', { value: pair[0] }, pair[1])); });
    languageLabel.appendChild(language); var search = el('button', { type: 'submit', class: 'lf-primary' }, 'Rechercher');
    form.append(queryLabel, languageLabel, search);
    var note = el('p', { class: 'lf-note' }, 'Catalogue du Projet Gutenberg. Livres du domaine public aux États-Unis ; vérifiez les droits applicables dans votre pays sur la fiche du livre.');
    var status = el('p', { class: 'lf-status', role: 'status', 'aria-live': 'polite' });
    var list = el('div', { 'aria-label': 'Résultats Gutenberg' }), pages = el('div', { class: 'lf-pages' });
    view.body.append(form, note, status, list, pages);
    function controls() {
      form.querySelectorAll('input,select,button').forEach(function (node) { node.disabled = busy; });
      list.querySelectorAll('button').forEach(function (node) { node.disabled = busy || downloaded.has(node.dataset.book); });
      pages.querySelectorAll('button').forEach(function (node) { node.disabled = busy; });
    }
    async function load(url) {
      if (busy) return;
      var request = ++generation; busy = true; controls(); status.textContent = 'Chargement du catalogue…';
      try {
        var feed = await api.fetchFeed(url, view.signal); if (view.signal.aborted || request !== generation) return;
        list.replaceChildren(); pages.replaceChildren();
        feed.entries.forEach(function (book) {
          var card = el('article', { class: 'lf-book' }), info = el('div', { class: 'lf-book-info' });
          var link = el('a', { href: api.ORIGIN + '/ebooks/' + book.id, target: '_self', rel: 'noopener noreferrer' }, 'Fiche Gutenberg');
          info.append(el('h2', {}, book.title), el('p', {}, book.author), link);
          var get = button(downloaded.get(String(book.id)) || 'Télécharger', function () { download(book, get); }, 'lf-primary');
          get.dataset.book = String(book.id); card.append(el('span', { class: 'lf-badge', 'aria-hidden': 'true' }, 'EPUB'), info, get); list.appendChild(card);
        });
        if (feed.previous) pages.appendChild(button('← Précédents', function () { load(feed.previous); }));
        if (feed.next) pages.appendChild(button('Suivants →', function () { load(feed.next); }));
        status.textContent = feed.entries.length ? feed.entries.length + ' livres sur cette page.' : 'Aucun livre trouvé. Essayez un autre titre ou auteur.';
        view.body.scrollTop = 0;
      } catch (error) {
        if (!view.signal.aborted) {
          status.textContent = error.message || 'Impossible de charger le catalogue.';
          pages.replaceChildren(button('Réessayer', function () { load(url); }));
        }
      } finally { busy = false; if (!view.signal.aborted) controls(); }
    }
    async function download(book, get) {
      if (busy) return; busy = true; controls(); get.textContent = 'Téléchargement…'; status.textContent = 'Préparation de « ' + book.title + ' »…';
      try {
        var feed = await api.fetchFeed(book.detailUrl, view.signal), file = feed.acquisition;
        if (!file) throw new Error('Aucun EPUB disponible. Consultez la fiche Gutenberg.');
        if (!/^Public domain in the USA\.?$/i.test(file.rights)) throw new Error('Ce livre a des conditions particulières. Consultez sa fiche Gutenberg.');
        if (file.length > 40 * 1024 * 1024) throw new Error('Ce livre dépasse la limite de 40 Mo.');
        var bytes = await api.fetchEpub(file.url, view.signal); if (view.signal.aborted) return;
        status.textContent = 'Ajout à la bibliothèque…';
        var result = await options.onImport(bytes); if (view.signal.aborted) return;
        var label = result.duplicates ? 'Déjà présent' : 'Ajouté'; downloaded.set(String(book.id), label); get.textContent = label;
        status.textContent = result.duplicates ? 'Ce livre est déjà dans votre bibliothèque.' : '« ' + (result.title || book.title) + ' » a rejoint votre bibliothèque. Vous pouvez le lire hors ligne.';
      } catch (error) { if (!view.signal.aborted) { status.textContent = error.message || 'Téléchargement impossible.'; get.textContent = 'Réessayer'; } }
      finally { busy = false; if (!view.signal.aborted) controls(); }
    }
    form.addEventListener('submit', function (event) { event.preventDefault(); load(api.searchUrl(query.value, language.value)); });
    load(api.searchUrl('', 'fr'));
  }
  function reportImport(report) {
    var view = dialog('Import terminé'); view.body.classList.add('lf-report');
    view.body.append(el('p', {}, report.added + ' livre' + (report.added > 1 ? 's ajoutés' : ' ajouté') + ' à la bibliothèque.'));
    if (report.duplicates) view.body.append(el('p', {}, report.duplicates + ' doublon' + (report.duplicates > 1 ? 's ignorés.' : ' ignoré.')));
    if (report.errors.length) {
      view.body.append(el('p', {}, report.errors.length + ' fichier' + (report.errors.length > 1 ? 's non importés :' : ' non importé :')));
      var list = el('ul', { class: 'lf-errors' }); report.errors.forEach(function (error) { list.append(el('li', {}, error.name + ' — ' + error.message)); }); view.body.append(list);
    }
    view.body.append(button('Voir la bibliothèque', view.close, 'lf-primary'));
  }
  window.LisiereFeatures = { openCatalogue: openCatalogue, reportImport: reportImport };
})();
