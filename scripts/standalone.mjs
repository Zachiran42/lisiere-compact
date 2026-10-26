import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist');
let html = await fs.readFile(path.join(output, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*?)\bsrc="([^"]+)"([^>]*)><\/script>/g)];
if (!scripts.length) throw new Error('Aucun bundle JavaScript trouvé. Lancez npm run build:web.');
for (const [tag, , source] of scripts) {
  if (/^(https?:)?\/\//.test(source)) throw new Error(`Ressource externe non autonome : ${source}`);
  const script = await fs.readFile(path.join(output, source.replace(/^\//, '')), 'utf8');
  html = html.replace(tag, () => `<script>${script.replace(/<\/script/gi, '<\\/script')}</script>`);
}
html = html.replace(/<link\b[^>]*rel="(?:icon|preload|modulepreload)"[^>]*>/g, '');
html = html.replace(/<title>[^<]*<\/title>/, '<title>Lisière — Le temps de lire</title>');
html = html.replace(/<html lang="[^"]*">/, '<html lang="fr">');
html = html.replace('You need to enable JavaScript to run this app.', 'Activez JavaScript pour ouvrir votre bibliothèque.');
await fs.mkdir(path.join(root, 'release'), { recursive: true });
await fs.writeFile(path.join(root, 'release', 'Lisiere.html'), html);
console.log(`Fichier autonome créé : release/Lisiere.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} Mio)`);
