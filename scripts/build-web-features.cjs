// SPDX-License-Identifier: MIT
// Preserve the shipped bookshelf UI while attaching readable feature modules.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'web/base-1.3.html'), 'utf8');
const expected = 'be53eb10e3c836c816f73cf4c04feeacc88245eb1756138350f49c8969df9687';
if (crypto.createHash('sha256').update(html).digest('hex') !== expected) throw Error('Unexpected base HTML');
function replaceOnce(text, from, to) {
  if (text.split(from).length !== 2) throw Error('Patch anchor missing or repeated: ' + from.slice(0, 80));
  return text.replace(from, to);
}
function moduleRange(id) {
  const tail = new RegExp('\\},' + id + ',\\[[^\\]]*\\]\\);').exec(html);
  if (!tail) throw Error('Module missing: ' + id);
  const end = tail.index + tail[0].length;
  return [html.lastIndexOf('__d(function', end), end];
}
let [start, end] = moduleRange(2157);
const importer = `__d(function(g,r,i,a,m,e,d){"use strict";Object.defineProperty(e,'__esModule',{value:true});var parser=r(d[0]);e.pickEpubs=function(){return globalThis.LisiereImportTools.pickEpubs(parser.parseEpub)};e.importEpubBytes=function(bytes){return globalThis.LisiereImportTools.importBytes(bytes,parser.parseEpub)};e.pickEpub=async function(){var result=await e.pickEpubs();return result&&result.books[0]||null};},2157,[2158]);`;
html = html.slice(0, start) + importer + html.slice(end);
[start, end] = moduleRange(140);
let app = html.slice(start, end);
app = replaceOnce(app, "[re,le]=(0,t.useState)(''),se=", "[re,le]=(0,t.useState)(''),libraryStateRef=(0,t.useRef)(I),se=");
app = replaceOnce(app, '},[]);(0,t.useEffect)(()=>{se()}', '},[]);libraryStateRef.current=I;(0,t.useEffect)(()=>{se()}');
const helper = `function acceptImportedBooks(result,showReport=true){const report=window.LisiereImportTools.mergeBooks(libraryStateRef.current.books,result);if(report.added){const next=Object.assign({},libraryStateRef.current,{books:report.books});libraryStateRef.current=next;P(next)}N('library');_('all');G('');le(report.added?report.added+' livre'+(report.added>1?'s ajoutés.':' ajouté.'):report.duplicates?'Ce livre est déjà dans votre bibliothèque.':'Aucun livre importé.');if(showReport&&(report.total>1||report.errors.length))window.LisiereFeatures.reportImport(report);return report;}`;
app = replaceOnce(app, ';const ne=(0,t.useCallback)', ';' + helper + 'const ne=(0,t.useCallback)');
const oldImport = app.slice(app.indexOf('ce=async()=>'), app.indexOf(',ue=I.books.find'));
app = replaceOnce(app, oldImport, `ce=async()=>{if(!oe){ie(true);try{const result=await j.pickEpubs();if(result)acceptImportedBooks(result)}catch(error){le(error instanceof Error?error.message:'Impossible d’importer ces livres.')}finally{ie(false)}}}`);
const catalogue = `'library'===M?(0,z.jsxs)(s.default,{accessibilityRole:'button',accessibilityLabel:'Explorer les livres gratuits du Projet Gutenberg',disabled:oe,onPress:()=>window.LisiereFeatures.openCatalogue({onImport:async bytes=>{const book=await j.importEpubBytes(bytes);return acceptImportedBooks({books:[book],errors:[]},false)}}),style:[L.resumeStrip,{marginTop:14,paddingVertical:12}],children:[(0,z.jsx)(x.BookOpen,{size:20,color:C.colors.green}),(0,z.jsx)(c.default,{style:{flex:1,fontSize:13,color:C.colors.green},children:'Explorer les livres gratuits'}),(0,z.jsx)(x.ArrowRight,{size:18,color:C.colors.green})]}):null,`;
app = replaceOnce(app, ",'library'===M&&ge?.lastOpenedAt", ',' + catalogue + "'library'===M&&ge?.lastOpenedAt");
app = replaceOnce(app, 'VERSION 1.3 COMPACT', 'VERSION 1.4.0 COMPACT');
app = replaceOnce(app, 'Importer un EPUB', 'Importer des EPUB');
app = replaceOnce(app, 'Importer un livre', 'Importer des livres');

html = html.slice(0, start) + app + html.slice(end);
html = replaceOnce(html, 'Ajouter un fichier EPUB', 'Ajouter des fichiers EPUB');
const features = ['imports.js', 'gutenberg.js', 'catalogue.js'].map(name => {
  const source = fs.readFileSync(path.join(root, 'web/features', name), 'utf8').replace(/^\uFEFF/, '');
  if (/<\/script/i.test(source)) throw Error('Unescaped script closing tag in ' + name);
  return '<script>\n' + source + '\n</script>';
}).join('\n');
html = html.replace('</head>', features + '\n</head>');
fs.writeFileSync(path.join(root, 'web/index.html'), html);
console.log('Built web/index.html:', crypto.createHash('sha256').update(html).digest('hex'));


