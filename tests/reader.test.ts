import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Script, createContext } from 'node:vm';
import { createReaderDocument, handleDocumentMessage } from '../src/reader/document';
import type { ReadingSettings } from '../src/types';

const settings: ReadingSettings = { theme: 'paper', fontSize: 20, fontFamily: 'serif', lineHeight: 1.8 };

function documentScript(html: string): string {
  const match = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  assert.ok(match, 'The trusted reader script exists');
  return match[1];
}

test('book title and anchor identifiers cannot escape into active document markup', () => {
  const html = createReaderDocument({
    html: '<p>Un texte nettoyé.</p>',
    title: '</title><script>throw new Error("injection")</script>',
    settings,
    initialScroll: 0,
    targetId: '</script><script>throw new Error("injection")</script>',
  });
  assert.equal((html.match(/<script\b/g) || []).length, 1);
  assert.ok(html.includes('&lt;/title&gt;'));
  assert.ok(html.includes('\\u003c/script>'));
  assert.ok(html.includes("default-src 'none'"));
  assert.ok(html.includes("form-action 'none'"));
  assert.doesNotThrow(() => new Script(documentScript(html)));
});

test('bridge ignores malformed, unrelated, nonfinite, and oversized messages', () => {
  const received: unknown[] = [];
  const handlers = { onScroll: (value: number) => received.push(value), onLink: (value: string) => received.push(value) };
  for (const message of [
    null,
    'text',
    { channel: 'another-frame', type: 'scroll', value: 0.5 },
    { channel: 'lisiere-reader-v1', type: 'scroll', value: NaN },
    { channel: 'lisiere-reader-v1', type: 'scroll', value: Infinity },
    { channel: 'lisiere-reader-v1', type: 'scroll', value: '0.5' },
    { channel: 'lisiere-reader-v1', type: 'link', value: 'a'.repeat(4097) },
  ]) handleDocumentMessage(message, handlers);
  assert.deepEqual(received, []);
  handleDocumentMessage({ channel: 'lisiere-reader-v1', type: 'scroll', value: 1.2 }, handlers);
  handleDocumentMessage({ channel: 'lisiere-reader-v1', type: 'scroll', value: -0.2 }, handlers);
  handleDocumentMessage({ channel: 'lisiere-reader-v1', type: 'link', value: 'OPS/chapter.xhtml#note' }, handlers);
  assert.deepEqual(received, [1, 0, 'OPS/chapter.xhtml#note']);
});

test('reading document restores relative position before publishing progress', async () => {
  const messages: unknown[] = [];
  const eventListeners: Record<string, (...arguments_: any[]) => void> = {};
  const scrolls: number[] = [];
  const window = {
    innerWidth: 390,
    innerHeight: 800,
    scrollY: 0,
    parent: { postMessage: (message: unknown) => messages.push(message) },
    scrollTo: (_x: number, y: number) => { scrolls.push(y); window.scrollY = y; },
    addEventListener: (name: string, callback: (...arguments_: any[]) => void) => { eventListeners[name] = callback; },
  };
  const document = {
    documentElement: { scrollHeight: 2400 },
    images: [],
    addEventListener: () => undefined,
    getElementById: () => null,
  };
  const html = createReaderDocument({ html: '<p>Texte</p>', title: 'Chapitre', settings, initialScroll: 0.625 });
  const context = createContext({ window, document, requestAnimationFrame: (callback: () => void) => callback(), setTimeout: () => 1, clearTimeout: () => undefined });
  new Script(documentScript(html)).runInContext(context);
  // Flush promises created inside the isolated context.
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(scrolls, [1000]);
  assert.equal(messages.length, 1);
  assert.equal((messages[0] as { value: number }).value, 0.625);
  assert.equal((messages[0] as { type: string }).type, 'scroll');
});

test('font-size bridge accepts only finite sizes within the supported range', () => {
  const sizes: number[] = [];
  const handlers = { onScroll: () => undefined, onLink: () => undefined, onFontSize: (size: number) => sizes.push(size) };
  for (const value of [null, '20', NaN, Infinity, 13, 33]) {
    handleDocumentMessage({ channel: 'lisiere-reader-v1', type: 'fontSize', value }, handlers);
  }
  handleDocumentMessage({ channel: 'another-frame', type: 'fontSize', value: 20 }, handlers);
  assert.deepEqual(sizes, []);
  for (const value of [14, 25.6, 32]) {
    handleDocumentMessage({ channel: 'lisiere-reader-v1', type: 'fontSize', value }, handlers);
  }
  assert.deepEqual(sizes, [14, 26, 32]);
});
