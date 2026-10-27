/* SPDX-License-Identifier: MIT — Copyright (c) 2026 Zachiran42. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LisiereLibrary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function getView(settings) { return settings && settings.libraryView === 'spines' ? 'spines' : 'covers'; }
  function create(React, BookCover) {
    var h = React.createElement;
    function preview(view) {
      return h('svg', { viewBox: '0 0 100 66', width: 100, height: 66, 'aria-hidden': true, focusable: false },
        view === 'covers' ? [0, 1, 2].map(function (index) {
          return h('g', { key: index },
            h('rect', { x: 9 + index * 29, y: 10, width: 24, height: 39, rx: 2, fill: ['#345945', '#98725C', '#7B8963'][index] }),
            h('rect', { x: 12 + index * 29, y: 14, width: 18, height: 31, rx: 1, fill: 'none', stroke: '#f8efd7', strokeWidth: .6 }),
            h('path', { d: 'M' + (16 + index * 29) + ' 33l5-10 5 10z', fill: '#E4DDC4' }),
            h('path', { d: 'M' + (14 + index * 29) + ' 54h14', stroke: '#79816F', strokeWidth: 2, strokeLinecap: 'round' }));
        }) : [0, 1, 2, 3, 4, 5].map(function (index) {
          return h('g', { key: index },
            h('rect', { x: 11 + index * 13, y: 11 + (index % 2) * 5, width: 10, height: 43 - (index % 2) * 5, rx: 2, fill: ['#345945', '#7B8963', '#98725C'][index % 3] }),
            h('path', { d: 'M' + (14 + index * 13) + ' 23v20', stroke: '#EEE5D0', strokeWidth: 1 }));
        }));
    }
    function ViewSettings(props) {
      var selected = getView(props.settings);
      return h('section', { className: 'lc-settings', 'aria-labelledby': 'lc-settings-title' },
        h('h2', { id: 'lc-settings-title' }, 'Votre bibliothèque'),
        h('p', null, 'Choisissez comment afficher vos livres. Ce choix s’applique aussi aux favoris.'),
        h('fieldset', { className: 'lc-choices' },
          h('legend', { className: 'lc-sr-only' }, 'Affichage de la bibliothèque'),
          [['covers', 'Couvertures'], ['spines', 'Tranches']].map(function (option) {
            return h('label', { key: option[0], className: 'lc-choice' + (selected === option[0] ? ' lc-selected' : '') },
              h('input', { type: 'radio', name: 'lisiere-library-view', value: option[0], checked: selected === option[0],
                onChange: function () { props.onChange(Object.assign({}, props.settings, { libraryView: option[0] })); } }),
              preview(option[0]), h('span', null, option[1]));
          })));
    }
    function Tile(props) {
      var book = props.book, image = book.cover;
      var failure = React.useState(false), failed = failure[0], setFailed = failure[1];
      React.useEffect(function () { setFailed(false); }, [image]);
      var cover = image && !failed ? h('img', { className: 'lc-cover-image', src: image, alt: 'Couverture de ' + book.title,
        loading: 'lazy', decoding: 'async', onError: function () { setFailed(true); } }) :
        h('span', { className: 'lc-art-inner', 'aria-hidden': true }, h(BookCover, { book: Object.assign({}, book, { cover: undefined }), compact: true }));
      return h('article', { className: 'lc-item', role: 'listitem' },
        h('button', { type: 'button', className: 'lc-card', 'aria-label': 'Voir les options de ' + book.title,
          onClick: function () { props.onSelect(book); } },
          h('span', { className: 'lc-art' }, cover, book.favorite ? h('span', { className: 'lc-favorite', 'aria-label': 'Favori' }, '♥') : null),
          h('span', { className: 'lc-book-title' }, book.title),
          h('span', { className: 'lc-book-author' }, book.author),
          h('span', { className: 'lc-progress' }, book.finished ? 'Terminé' : book.lastOpenedAt ? props.progress(book) + ' % lu' : 'À découvrir')));
    }
    function Covers(props) {
      var cards = props.books.map(function (book) { return h(Tile, { key: book.id, book: book, onSelect: props.onSelect, progress: props.progress }); });
      if (props.onImport) cards.push(h('article', { className: 'lc-item', role: 'listitem', key: 'import' },
        h('button', { type: 'button', className: 'lc-card lc-add-card', disabled: props.importing, onClick: props.onImport, 'aria-label': 'Ajouter des fichiers EPUB' },
          h('span', { className: 'lc-art lc-add-art' }, h('span', { className: 'lc-add-inner' },
            h('span', { className: 'lc-plus', 'aria-hidden': true }, '+'), h('span', null, props.importing ? 'Import…' : 'Importer des livres'))),
          h('span', { className: 'lc-book-title' }, 'Un livre de plus'))));
      return h('div', { className: 'lc-grid', role: 'list', 'aria-label': 'Bibliothèque en couvertures' }, cards);
    }
    return { Covers: Covers, ViewSettings: ViewSettings };
  }
  return { create: create, getView: getView };
});
