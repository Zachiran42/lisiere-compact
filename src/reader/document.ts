import type { ReadingSettings } from '../types';
import { PINCH_GESTURE_SCRIPT } from './pinchGesture';

export interface DocumentViewProps {
  html: string;
  title: string;
  settings: ReadingSettings;
  /** Fraction of this chapter, from 0 to 1. Applied when the document loads. */
  initialScroll: number;
  targetId?: string;
  onScroll: (fraction: number) => void;
  onLink: (href: string) => void;
  onFontSize?: (fontSize: number) => void;
}

export const DOCUMENT_MESSAGE = 'lisiere-reader-v1';

export function documentColors(theme: ReadingSettings['theme']) {
  if (theme === 'night') return { background: '#18231F', foreground: '#E9ECE5', muted: '#A1B0A6', accent: '#B4D1AC', line: '#34483C' };
  if (theme === 'sepia') return { background: '#F5EBD8', foreground: '#493C2C', muted: '#8C7B62', accent: '#6A5333', line: '#DDD0B9' };
  return { background: '#F8F7F2', foreground: '#273B31', muted: '#7D837B', accent: '#234C3D', line: '#E5E7DE' };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function clamp(value: number, minimum: number, maximum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;
}

/** Only sanitized EPUB markup is accepted here. The sole active script is our bridge. */
export function createReaderDocument(props: Pick<DocumentViewProps, 'html' | 'title' | 'settings' | 'initialScroll' | 'targetId'>): string {
  const colors = documentColors(props.settings.theme);
  const fontSize = clamp(props.settings.fontSize, 14, 32, 20);
  const lineHeight = clamp(props.settings.lineHeight, 1.25, 2.3, 1.75);
  const fontFamily = props.settings.fontFamily === 'sans'
    ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    : 'Georgia, "Times New Roman", serif';
  // A fresh nonce separates trusted bridge code from the imported book markup.
  const nonce = Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join('');
  const config = JSON.stringify({
    channel: DOCUMENT_MESSAGE,
    fontSize,
    initialScroll: clamp(props.initialScroll, 0, 1, 0),
    targetId: props.targetId || '',
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'">
<meta name="color-scheme" content="${props.settings.theme === 'night' ? 'dark' : 'light'}">
<title>${escapeHtml(props.title)}</title>
<style>
  :root { color-scheme: ${props.settings.theme === 'night' ? 'dark' : 'light'}; background: ${colors.background}; }
  * { box-sizing: border-box; }
  html { margin: 0; touch-action: pan-x pan-y; scroll-behavior: auto; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  body { margin: 0; background: ${colors.background}; color: ${colors.foreground}; font: ${fontSize}px/${lineHeight} ${fontFamily}; overflow-wrap: anywhere; }
  main { width: 100%; max-width: 820px; margin: 0 auto; padding: 16px 22px 24px; }
  p { margin: 0 0 1.15em; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.3; text-wrap: balance; font-weight: 500; margin: 1.4em 0 .9em; }
  main > :first-child { margin-top: 0; }
  h1 { font-size: 1.9em; } h2 { font-size: 1.55em; } h3 { font-size: 1.25em; }
  a { color: ${colors.accent}; text-underline-offset: .18em; }
  img { max-width: 100%; height: auto; display: block; margin: 1.1em auto; }
  figure { margin: 1.4em 0; } figcaption { color: ${colors.muted}; font-size: .85em; text-align: center; }
  blockquote { margin: 1.3em 0; padding: .2em 0 .2em 1.1em; border-left: 2px solid ${colors.line}; color: ${colors.muted}; }
  hr { border: 0; border-top: 1px solid ${colors.line}; width: 20%; margin: 2em auto; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; font-size: .85em; }
  table { max-width: 100%; border-collapse: collapse; display: block; overflow-x: auto; }
  td, th { padding: .4em; border: 1px solid ${colors.line}; }
  ::selection { background: ${props.settings.theme === 'night' ? '#50674F' : '#D4DFC7'}; }
  @media (min-width: 700px) { main { padding: 24px 42px 32px; } }
  @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>
</head>
<body><main>${props.html}</main>
<script nonce="${nonce}">
(function () {
  'use strict';
  var config = ${config};
  var restoring = true;
  var timer;
  var lastValue = -1;
${PINCH_GESTURE_SCRIPT}
  function post(type, value) {
    var message = { channel: config.channel, type: type, value: value };
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    } else if (window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
  }
  function fraction() {
    var maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return maximum > 2 ? Math.max(0, Math.min(1, window.scrollY / maximum)) : 1;
  }
  function report() {
    if (restoring || pinch) return;
    var value = fraction();
    if (Math.abs(lastValue - value) < .0001) return;
    lastValue = value;
    post('scroll', value);
  }
  window.addEventListener('scroll', function () {
    clearTimeout(timer);
    timer = setTimeout(report, 120);
  }, { passive: true });
  window.addEventListener('pagehide', report);
  document.addEventListener('click', function (event) {
    var element = event.target;
    var link = element && element.closest ? element.closest('a') : null;
    if (!link) return;
    event.preventDefault();
    var destination = link.getAttribute('data-epub-href');
    if (destination) { post('link', destination); return; }
    var href = link.getAttribute('href') || '';
    if (href.charAt(0) === '#') {
      var id;
      try { id = decodeURIComponent(href.slice(1)); } catch (_) { id = href.slice(1); }
      var anchor = document.getElementById(id);
      if (anchor) anchor.scrollIntoView();
      report();
    }
  });
  function restore() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var anchor = config.targetId ? document.getElementById(config.targetId) : null;
        if (anchor) anchor.scrollIntoView();
        else window.scrollTo(0, config.initialScroll * Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
        requestAnimationFrame(function () { restoring = false; report(); });
      });
    });
  }
  var imagePromises = Array.prototype.map.call(document.images, function (image) {
    if (image.complete) return Promise.resolve();
    return new Promise(function (resolve) { image.onload = resolve; image.onerror = resolve; });
  });
  if (document.fonts && document.fonts.ready) imagePromises.push(document.fonts.ready);
  Promise.race([
    Promise.all(imagePromises),
    new Promise(function (resolve) { setTimeout(resolve, 1800); })
  ]).then(restore);
  var oldWidth = window.innerWidth;
  window.addEventListener('resize', function () {
    if (restoring || oldWidth === window.innerWidth) return;
    oldWidth = window.innerWidth;
    var saved = Math.max(0, lastValue);
    requestAnimationFrame(function () {
      window.scrollTo(0, saved * Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
      report();
    });
  });
})();
</script></body></html>`;
}

/** Only accept bounded messages from our isolated reading document. */
export function handleDocumentMessage(value: unknown, props: Pick<DocumentViewProps, 'onScroll' | 'onLink' | 'onFontSize'>): void {
  if (!value || typeof value !== 'object') return;
  const message = value as { channel?: unknown; type?: unknown; value?: unknown };
  if (message.channel !== DOCUMENT_MESSAGE) return;
  if (message.type === 'fontSize') {
    if (typeof message.value === 'number' && Number.isFinite(message.value) && message.value >= 14 && message.value <= 32) {
      props.onFontSize?.(Math.round(message.value));
    }
    return;
  }
  if (message.type === 'scroll' && typeof message.value === 'number' && Number.isFinite(message.value)) {
    props.onScroll(Math.max(0, Math.min(1, message.value)));
  } else if (message.type === 'link' && typeof message.value === 'string' && message.value.length <= 4096) {
    props.onLink(message.value);
  }
}
