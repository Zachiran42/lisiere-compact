import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { createReaderDocument, documentColors, DOCUMENT_MESSAGE, handleDocumentMessage, type DocumentViewProps } from './document';

export type { DocumentViewProps } from './document';

export default function DocumentView(props: DocumentViewProps) {
  const frame = useRef<WebView>(null);
  const latest = useRef(props);
  latest.current = props;
  // A scroll or font-size update must not replace the document.
  const html = useMemo(() => createReaderDocument(latest.current), [
    props.html, props.title, props.targetId,
    props.settings.theme, props.settings.fontFamily, props.settings.lineHeight,
  ]);
  const source = useMemo(() => ({ html, baseUrl: 'about:blank' }), [html]);
  const syncFontSize = useCallback(() => {
    const message = JSON.stringify({ channel: DOCUMENT_MESSAGE, type: 'fontSize', value: latest.current.settings.fontSize });
    frame.current?.injectJavaScript(`window.postMessage(${message}, '*'); true;`);
  }, []);
  useEffect(syncFontSize, [props.settings.fontSize, html, syncFontSize]);
  return (
    <WebView
      ref={frame}
      source={source}
      onLoadEnd={syncFontSize}
      style={[styles.document, { backgroundColor: documentColors(props.settings.theme).background }]}
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={(request) => request.url === 'about:blank' || request.url.startsWith('about:blank#') || request.url.startsWith('data:text/html')}
      onMessage={(event) => {
        try { handleDocumentMessage(JSON.parse(event.nativeEvent.data), latest.current); } catch { /* Ignore malformed messages. */ }
      }}
      javaScriptEnabled
      domStorageEnabled={false}
      allowFileAccess={false}
      allowUniversalAccessFromFileURLs={false}
      allowFileAccessFromFileURLs={false}
      mixedContentMode="never"
      setSupportMultipleWindows={false}
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
      automaticallyAdjustContentInsets={false}
      textZoom={100}
      accessibilityLabel={`Lecture : ${props.title}`}
    />
  );
}

const styles = StyleSheet.create({ document: { flex: 1 } });
