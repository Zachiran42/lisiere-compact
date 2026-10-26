import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createReaderDocument, documentColors, DOCUMENT_MESSAGE, handleDocumentMessage, type DocumentViewProps } from './document';

export type { DocumentViewProps } from './document';

export default function DocumentView(props: DocumentViewProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef(props);
  latest.current = props;
  // Font size is synchronized into the existing document so pinching never reloads it.
  const html = useMemo(() => createReaderDocument(latest.current), [
    props.html, props.title, props.targetId,
    props.settings.theme, props.settings.fontFamily, props.settings.lineHeight,
  ]);
  const syncFontSize = useCallback(() => {
    frame.current?.contentWindow?.postMessage({
      channel: DOCUMENT_MESSAGE,
      type: 'fontSize',
      value: latest.current.settings.fontSize,
    }, '*');
  }, []);
  useEffect(syncFontSize, [props.settings.fontSize, html, syncFontSize]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      // The sandbox has an opaque origin; the source window is the boundary.
      if (event.source !== frame.current?.contentWindow) return;
      handleDocumentMessage(event.data, latest.current);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  return React.createElement('iframe', {
    ref: frame,
    srcDoc: html,
    onLoad: syncFontSize,
    title: `Lecture : ${props.title}`,
    sandbox: 'allow-scripts',
    referrerPolicy: 'no-referrer',
    style: {
      border: 0, display: 'block', width: '100%', height: '100%', minHeight: 0, flex: 1,
      backgroundColor: documentColors(props.settings.theme).background,
    },
  });
}
