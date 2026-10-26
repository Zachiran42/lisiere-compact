import { expect, test, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const sampleTitle = 'Les heures bleues';
const importedTitle = 'Le carnet du voyageur';

async function createFixture() {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  zip.file('OPS/book.opf', `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="id" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">lisiere-browser-test</dc:identifier><dc:title>${importedTitle}</dc:title><dc:creator>Camille Test</dc:creator><dc:language>fr</dc:language></metadata><manifest><item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/><item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="ch1"/><itemref idref="ch2"/></spine></package>`);
  zip.file('OPS/nav.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="chapter1.xhtml">Le premier départ</a></li><li><a href="chapter2.xhtml">Le retour</a></li></ol></nav></body></html>');
  for (const [index, title] of ['Le premier départ', 'Le retour'].entries()) {
    const paragraphs = Array.from({ length: 16 }, (_, number) => `<p>Étape ${number + 1}. Le voyageur ouvrait son carnet devant la fenêtre. Chaque page gardait la trace d’un lieu, d’un sourire et d’un chemin parcouru. Il prenait le temps de regarder la lumière sur les arbres.</p>`).join('');
    zip.file(`OPS/chapter${index + 1}.xhtml`, `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body><h1>${title}</h1>${paragraphs}</body></html>`);
  }
  return { name: 'carnet.epub', mimeType: 'application/epub+zip', buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }) };
}

async function importFixture(page: Page, fixture: Awaited<ReturnType<typeof createFixture>>) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importer un EPUB', exact: true }).click();
  await (await chooser).setFiles(fixture);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: `Lire ${sampleTitle}`, exact: true })).toBeVisible();
});

test('library and reader keep progress, bookmarks and reading preferences after reload', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir(path.join(process.cwd(), 'artifacts'), { recursive: true });
  await page.screenshot({ path: `artifacts/library-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: `Lire ${sampleTitle}`, exact: true }).click();
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: 'La fenêtre du matin', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chapitre suivant', exact: true }).click();
  await expect(frame.getByRole('heading', { name: 'Le détour', exact: true })).toBeVisible();
  await frame.locator('body').evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * 0.45));
  await expect.poll(async () => page.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('48');
  await page.getByRole('button', { name: 'Ajouter un marque-page à cet endroit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retirer le marque-page à cet endroit', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Réglages de lecture', exact: true }).click();
  await page.getByRole('radio', { name: 'Thème nuit', exact: true }).click();
  await page.getByRole('button', { name: 'Agrandir la taille du texte', exact: true }).click();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(frame.locator('body')).toHaveCSS('font-size', '22px');
  await expect(frame.locator('body')).toHaveCSS('background-color', 'rgb(24, 35, 31)');
  await expect.poll(async () => frame.locator('body').evaluate(() => window.scrollY / (document.documentElement.scrollHeight - window.innerHeight))).toBeGreaterThan(0.4);
  await page.screenshot({ path: `artifacts/reader-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Revenir à la bibliothèque', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuer la lecture', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: `Lire ${sampleTitle}`, exact: true }).click();
  await expect(frame.getByRole('heading', { name: 'Le détour', exact: true })).toBeAttached();
  await expect(frame.locator('body')).toHaveCSS('font-size', '22px');
  await expect(frame.locator('body')).toHaveCSS('background-color', 'rgb(24, 35, 31)');
  await expect.poll(async () => frame.locator('body').evaluate(() => window.scrollY / (document.documentElement.scrollHeight - window.innerHeight))).toBeGreaterThan(0.4);
  await page.getByRole('button', { name: 'Afficher le sommaire et les marque-pages', exact: true }).click();
  await page.getByRole('tab', { name: 'Marque-pages (1)', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reprendre au marque-page Le détour', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer le marque-page Le détour', exact: true }).click();
  await expect(page.getByText('Gardez une page pour plus tard', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('EPUB import, duplicate prevention, favorites and deletion survive reload', async ({ page }) => {
  const fixture = await createFixture();
  await importFixture(page, fixture);
  await expect(page.getByText(`« ${importedTitle} » a rejoint votre bibliothèque.`, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: `Lire ${importedTitle}`, exact: true })).toHaveCount(1);
  await expect(page.getByText('Camille Test', { exact: true }).first()).toBeVisible();
  await importFixture(page, fixture);
  await expect(page.getByText('Ce livre est déjà dans votre bibliothèque.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: `Lire ${importedTitle}`, exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: `Lire ${importedTitle}`, exact: true }).click();
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Le premier départ', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chapitre suivant', exact: true }).click();
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Le retour', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Terminer le livre', exact: true }).click();
  await page.getByRole('button', { name: 'Terminés', exact: true }).click();
  await expect(page.getByRole('button', { name: `Lire ${importedTitle}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Options pour ${importedTitle}`, exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter aux favoris', exact: true }).click();
  await page.getByRole('button', { name: 'Fermer les options', exact: true }).click();
  await page.getByRole('tab', { name: 'Favoris', exact: true }).click();
  await expect(page.getByRole('button', { name: `Lire ${importedTitle}`, exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Favoris', exact: true }).click();
  await expect(page.getByRole('button', { name: `Lire ${importedTitle}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Options pour ${importedTitle}`, exact: true }).click();
  await page.getByRole('button', { name: 'Retirer de la bibliothèque', exact: true }).click();
  await expect(page.getByText('Retirer ce livre ?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Retirer de la bibliothèque', exact: true }).click();
  await expect(page.getByRole('button', { name: `Lire ${importedTitle}`, exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: `Lire ${importedTitle}`, exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Lire ${sampleTitle}`, exact: true })).toBeVisible();
});

test('mobile layout stays within its viewport and invalid imports give a useful error', async ({ page }) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('textbox', { name: 'Rechercher un livre ou un auteur', exact: true }).fill('introuvable');
  await expect(page.getByText('Aucun livre trouvé', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Effacer la recherche', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importer un EPUB', exact: true }).click();
  await (await chooser).setFiles({ name: 'corrompu.epub', mimeType: 'application/epub+zip', buffer: Buffer.from('not a zip file') });
  await expect(page.getByText('Ce fichier n’est pas un EPUB valide.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Importer un EPUB', exact: true })).toBeEnabled();
  await page.getByRole('tab', { name: 'Réglages', exact: true }).click();
  await expect(page.getByText('Le confort de lire.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Android back closes reader panels, then returns to the library', async ({ page }) => {
  const back = () => page.evaluate(() => window.dispatchEvent(new Event('lisiere-native-back', { cancelable: true })));
  await page.getByRole('button', { name: `Lire ${sampleTitle}`, exact: true }).click();
  await page.getByRole('button', { name: 'Réglages de lecture', exact: true }).click();
  expect(await back()).toBe(false);
  await expect(page.getByRole('heading', { name: 'À votre rythme' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Revenir à la bibliothèque' })).toBeVisible();
  expect(await back()).toBe(false);
  await expect(page.getByRole('button', { name: `Lire ${sampleTitle}`, exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Favoris', exact: true }).click();
  expect(await back()).toBe(false);
  await expect(page.getByRole('button', { name: `Lire ${sampleTitle}`, exact: true })).toBeVisible();
  expect(await back()).toBe(true);
});
