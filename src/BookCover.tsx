import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Line, Ellipse } from 'react-native-svg';
import type { LibraryBook } from './types';
import { serif } from './theme';

export default function BookCover({ book, compact = false }: { book: LibraryBook; compact?: boolean }) {
  if (book.cover) return <Image accessibilityLabel={`Couverture de ${book.title}`} source={{ uri: book.cover }} style={styles.cover} resizeMode="cover" />;
  const flower = book.id === 'sample-jardin-possibles';
  const sun = book.id === 'sample-lumiere';
  return <View style={[styles.cover, { backgroundColor: book.accent || '#234C3D' }]}>
    <View style={styles.spine} />
    <View style={styles.frame} />
    <Text style={[styles.edition, compact && { fontSize: 6, marginTop: 16, letterSpacing: 1 }]}>L I S I È R E</Text>
    <Text numberOfLines={4} style={[styles.title, compact && { fontSize: 19, lineHeight: 22, marginTop: 10, marginHorizontal: 12 }]}>{book.title}</Text>
    <View style={[styles.art, compact && { minHeight: 15, marginHorizontal: 14, marginVertical: 4 }]}>
      <Svg viewBox="0 0 160 150" width="100%" height="100%">
        {flower ? <>
          <Path d="M80 141C68 102 94 78 80 41" fill="none" stroke="#EED1A8" strokeWidth="2" />
          <Path d="M80 111C48 116 32 89 40 83C55 79 77 88 80 111M80 93C97 71 125 78 128 87C114 102 93 107 80 93" fill="#EED1A8" />
          <Ellipse cx="81" cy="35" rx="12" ry="25" fill="#EED1A8" />
          <Ellipse cx="81" cy="35" rx="12" ry="25" fill="#EED1A8" rotation="60" origin="81,35" />
          <Ellipse cx="81" cy="35" rx="12" ry="25" fill="#EED1A8" rotation="120" origin="81,35" />
          <Circle cx="81" cy="35" r="10" fill="#AD664E" />
        </> : sun ? <>
          <Circle cx="80" cy="56" r="32" fill="#F6E8C4" />
          <Path d="M10 113Q80 64 150 113M10 127Q80 78 150 127M10 141Q80 92 150 141" stroke="#F6E8C4" strokeWidth="1.3" fill="none" />
          <Line x1="80" y1="6" x2="80" y2="17" stroke="#F6E8C4" />
          <Line x1="31" y1="17" x2="40" y2="28" stroke="#F6E8C4" />
          <Line x1="129" y1="17" x2="120" y2="28" stroke="#F6E8C4" />
        </> : <>
          <Circle cx="104" cy="38" r="23" fill="#D3D5AB" />
          <Path d="M8 114L54 39L98 114Z" fill="#8DA791" />
          <Path d="M54 39L98 114H65Z" fill="#607F6A" />
          <Path d="M58 130L108 61L152 130Z" fill="#B4C2A2" />
          <Path d="M108 61L152 130H112Z" fill="#77937B" />
          <Path d="M9 142Q80 123 151 142" fill="none" stroke="#D3D5AB" />
        </>}
      </Svg>
    </View>
    <Text numberOfLines={2} style={[styles.author, compact && { fontSize: 6, letterSpacing: 0.4, marginHorizontal: 14, marginBottom: 14 }]}>{book.author}</Text>
  </View>;
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: '100%', borderRadius: 5, overflow: 'hidden' },
  spine: { position: 'absolute', left: 5, width: 2, top: 0, bottom: 0, backgroundColor: '#ffffff18' },
  frame: { position: 'absolute', left: 14, right: 12, top: 13, bottom: 13, borderWidth: 0.5, borderColor: '#ffffff38' },
  edition: { fontSize: 8, color: '#F4EDD9', textAlign: 'center', marginTop: 27, letterSpacing: 2 },
  title: { fontSize: 29, fontFamily: serif, lineHeight: 34, textAlign: 'center', color: '#FFF8E7', marginHorizontal: 22, marginTop: 22 },
  art: { flex: 1, minHeight: 28, marginHorizontal: 22, marginVertical: 9 },
  author: { fontSize: 8, letterSpacing: 1, textAlign: 'center', color: '#E3E5D3', marginHorizontal: 20, marginBottom: 25, textTransform: 'uppercase' },
});
