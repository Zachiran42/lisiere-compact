import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark as BookmarkIcon, Check, ChevronLeft, ChevronRight, List, Minus, Plus, Trash2, Type, X } from 'lucide-react-native';
import type { Bookmark, LibraryBook, ReadingSettings } from '../types';
import DocumentView from './DocumentView';

interface Props {
  book: LibraryBook;
  settings: ReadingSettings;
  onClose: () => void;
  onProgress: (chapterIndex: number, scroll: number) => void;
  onSettings: (settings: ReadingSettings) => void;
  onBookmark: (bookmark: Bookmark) => void;
  onRemoveBookmark: (id: string) => void;
  onFinished?: () => void;
}

const serif = Platform.select({ android: 'serif', default: 'Georgia' });

const palettes = {
  paper: { background: '#F8F7F2', foreground: '#273B31', muted: '#7D837B', line: '#E5E7DE', accent: '#234C3D', inset: '#F0F1EB' },
  sepia: { background: '#F5EBD8', foreground: '#493C2C', muted: '#8C7B62', line: '#DDD0B9', accent: '#6A5333', inset: '#EADFCB' },
  night: { background: '#18231F', foreground: '#E9ECE5', muted: '#A1B0A6', line: '#34483C', accent: '#B4D1AC', inset: '#24352B' },
};

export default function Reader({ book, settings, onClose, onProgress, onSettings, onBookmark, onRemoveBookmark, onFinished }: Props) {
  const [chapterIndex, setChapterIndex] = useState(() => Math.max(0, Math.min(book.chapterIndex, book.chapters.length - 1)));
  const [initialScroll, setInitialScroll] = useState(book.scroll || 0);
  const [scroll, setScroll] = useState(book.scroll || 0);
  const [targetId, setTargetId] = useState<string>();
  const [documentRevision, setDocumentRevision] = useState(0);
  const [panel, setPanel] = useState<'contents' | 'settings' | null>(null);
  const [contentsTab, setContentsTab] = useState<'chapters' | 'bookmarks'>('chapters');
  const latestScroll = useRef(book.scroll || 0);
  const { width } = useWindowDimensions();
  const colors = palettes[settings.theme];
  const chapter = book.chapters[chapterIndex];
  const progress = Math.min(100, Math.round(((chapterIndex + scroll) / Math.max(1, book.chapters.length)) * 100));
  const currentBookmark = book.bookmarks.find(mark => mark.chapterIndex === chapterIndex && Math.abs(mark.scroll - scroll) < 0.025);

  const updateProgress = useCallback((fraction: number) => {
    const value = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
    latestScroll.current = value;
    setScroll(value);
    onProgress(chapterIndex, value);
  }, [chapterIndex, onProgress]);

  const goTo = useCallback((index: number, fraction = 0, anchor?: string) => {
    if (index < 0 || index >= book.chapters.length) return;
    const value = Math.max(0, Math.min(1, fraction));
    setChapterIndex(index);
    setInitialScroll(value);
    setScroll(value);
    latestScroll.current = value;
    setTargetId(anchor);
    setDocumentRevision(previous => previous + 1);
    onProgress(index, value);
    setPanel(null);
  }, [book.chapters.length, onProgress]);

  const handleLink = useCallback((href: string) => {
    const hashAt = href.indexOf('#');
    const path = hashAt < 0 ? href : href.slice(0, hashAt);
    let anchor = hashAt < 0 ? undefined : href.slice(hashAt + 1);
    try { if (anchor) anchor = decodeURIComponent(anchor); } catch { /* Keep malformed identifiers literal. */ }
    const index = path ? book.chapters.findIndex(item => item.href === path) : chapterIndex;
    if (index !== -1) goTo(index, 0, anchor);
  }, [book.chapters, chapterIndex, goTo]);

  const closeReader = () => {
    onProgress(chapterIndex, latestScroll.current);
    onClose();
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onProgress(chapterIndex, latestScroll.current);
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [chapterIndex, onClose, onProgress]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const back = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (panel) setPanel(null);
      else { onProgress(chapterIndex, latestScroll.current); onClose(); }
    };
    window.addEventListener('lisiere-native-back', back);
    return () => window.removeEventListener('lisiere-native-back', back);
  }, [panel, chapterIndex, onClose, onProgress]);

  const changeSettings = (next: Partial<ReadingSettings>) => {
    // A document reflow should return to the same relative reading position.
    setInitialScroll(latestScroll.current);
    setTargetId(undefined);
    onSettings({ ...settings, ...next });
  };

  const toggleBookmark = () => {
    if (currentBookmark) {
      onRemoveBookmark(currentBookmark.id);
      return;
    }
    onBookmark({
      id: `bookmark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      chapterIndex,
      scroll: latestScroll.current,
      label: chapter?.title || `Chapitre ${chapterIndex + 1}`,
      createdAt: Date.now(),
    });
  };

  const orderedBookmarks = useMemo(() => [...book.bookmarks].sort((left, right) => left.chapterIndex - right.chapterIndex || left.scroll - right.scroll), [book.bookmarks]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View testID="reader-header" style={[styles.header, { borderColor: colors.line }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Revenir à la bibliothèque" onPress={closeReader} style={styles.backButton}>
          <ArrowLeft size={21} color={colors.foreground} strokeWidth={1.7} />
          {width > 560 && <Text style={[styles.backText, { color: colors.foreground }]}>Bibliothèque</Text>}
        </Pressable>
        <View style={styles.titleGroup}>
          <Text style={[styles.bookTitle, { color: colors.foreground }]} numberOfLines={1}>{book.title}</Text>
          <Text style={[styles.author, { color: colors.muted }]} numberOfLines={1}>{book.author}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={currentBookmark ? 'Retirer le marque-page à cet endroit' : 'Ajouter un marque-page à cet endroit'} accessibilityState={{ selected: !!currentBookmark }} onPress={toggleBookmark} style={styles.iconButton}>
          <BookmarkIcon size={21} color={colors.accent} fill={currentBookmark ? colors.accent : 'transparent'} strokeWidth={1.7} />
        </Pressable>
      </View>

      <View style={styles.document}>
        {chapter ? (
          <DocumentView
            key={`${book.id}-${chapterIndex}-${documentRevision}`}
            html={chapter.html}
            title={chapter.title}
            settings={settings}
            initialScroll={initialScroll}
            targetId={targetId}
            onScroll={updateProgress}
            onLink={handleLink}
            onFontSize={(fontSize) => changeSettings({ fontSize })}
          />
        ) : <Text style={[styles.emptyMessage, { color: colors.muted }]}>Ce livre ne contient aucun chapitre lisible.</Text>}
      </View>

      <View testID="reader-footer" style={[styles.footer, { borderColor: colors.line }]}>
        <View accessibilityRole="progressbar" accessibilityLabel="Progression dans le livre" accessibilityValue={{ min: 0, max: 100, now: progress }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={[styles.progressTrack, { backgroundColor: colors.line }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.accent }]} />
        </View>
        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Afficher le sommaire et les marque-pages" onPress={() => setPanel('contents')} style={styles.toolButton}>
            <List size={21} color={colors.foreground} strokeWidth={1.7} />
            {width > 420 && <Text style={[styles.toolText, { color: colors.foreground }]}>Sommaire</Text>}
          </Pressable>
          <View style={styles.chapterControls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Chapitre précédent" accessibilityState={{ disabled: chapterIndex === 0 }} disabled={chapterIndex === 0} onPress={() => goTo(chapterIndex - 1)} style={[styles.iconButton, styles.footerIconButton, chapterIndex === 0 && styles.disabled]}>
              <ChevronLeft size={22} color={colors.foreground} strokeWidth={1.7} />
            </Pressable>
            <View style={styles.positionGroup}>
              <Text numberOfLines={1} style={[styles.chapterCount, { color: colors.foreground }]}>{chapterIndex + 1} / {book.chapters.length}</Text>
              <Text style={[styles.progressLabel, { color: colors.muted }]}>{progress} %</Text>
            </View>
            {chapterIndex === book.chapters.length - 1 && onFinished ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Terminer le livre" onPress={() => { onProgress(chapterIndex, latestScroll.current); onFinished(); onClose(); }} style={[styles.iconButton, styles.footerIconButton]}>
                <Check size={21} color={colors.accent} />
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="Chapitre suivant" accessibilityState={{ disabled: chapterIndex >= book.chapters.length - 1 }} disabled={chapterIndex >= book.chapters.length - 1} onPress={() => goTo(chapterIndex + 1)} style={[styles.iconButton, styles.footerIconButton, chapterIndex >= book.chapters.length - 1 && styles.disabled]}>
                <ChevronRight size={22} color={colors.foreground} strokeWidth={1.7} />
              </Pressable>
            )}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Réglages de lecture" onPress={() => setPanel('settings')} style={styles.toolButton}>
            <Type size={22} color={colors.foreground} strokeWidth={1.7} />
            {width > 420 && <Text style={[styles.toolText, { color: colors.foreground }]}>Apparence</Text>}
          </Pressable>
        </View>
      </View>

      <Modal visible={panel !== null} animationType="fade" transparent onRequestClose={() => setPanel(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Fermer le panneau" onPress={() => setPanel(null)} />
          <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHeader}>
              <Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.foreground }]}>{panel === 'settings' ? 'À votre rythme' : 'Dans ce livre'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setPanel(null)} style={styles.iconButton}><X size={21} color={colors.foreground} /></Pressable>
            </View>
            {panel === 'settings' ? (
              <ScrollView contentContainerStyle={styles.settingsContent}>
                <Text style={[styles.settingLabel, { color: colors.muted }]}>AMBIANCE</Text>
                <View style={styles.themeRow}>
                  {(['paper', 'sepia', 'night'] as const).map(theme => (
                    <Pressable key={theme} accessibilityRole="radio" accessibilityState={{ checked: settings.theme === theme }} accessibilityLabel={{ paper: 'Thème papier', sepia: 'Thème sépia', night: 'Thème nuit' }[theme]} onPress={() => changeSettings({ theme })} style={[styles.themeOption, { backgroundColor: palettes[theme].background, borderColor: settings.theme === theme ? colors.accent : colors.line, borderWidth: settings.theme === theme ? 2 : 1 }]}>
                      <Text style={[styles.themeSample, { color: palettes[theme].foreground }]}>Aa</Text>
                      <Text style={[styles.themeName, { color: palettes[theme].foreground }]}>{ { paper: 'Papier', sepia: 'Sépia', night: 'Nuit' }[theme]}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.settingLabel, { color: colors.muted }]}>TAILLE DU TEXTE</Text>
                <View style={[styles.adjuster, { backgroundColor: colors.inset }]}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Réduire la taille du texte" accessibilityState={{ disabled: settings.fontSize <= 14 }} disabled={settings.fontSize <= 14} onPress={() => changeSettings({ fontSize: Math.max(14, settings.fontSize - 2) })} style={[styles.adjustButton, settings.fontSize <= 14 && styles.disabled]}><Minus size={21} color={colors.foreground} /></Pressable>
                  <Text style={[styles.adjustValue, { color: colors.foreground }]}>{settings.fontSize} px</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Agrandir la taille du texte" accessibilityState={{ disabled: settings.fontSize >= 32 }} disabled={settings.fontSize >= 32} onPress={() => changeSettings({ fontSize: Math.min(32, settings.fontSize + 2) })} style={[styles.adjustButton, settings.fontSize >= 32 && styles.disabled]}><Plus size={21} color={colors.foreground} /></Pressable>
                </View>
                <Text style={[styles.settingLabel, { color: colors.muted }]}>POLICE</Text>
                <View style={styles.fontRow}>
                  {(['serif', 'sans'] as const).map(fontFamily => (
                    <Pressable key={fontFamily} accessibilityRole="radio" accessibilityState={{ checked: settings.fontFamily === fontFamily }} onPress={() => changeSettings({ fontFamily })} style={[styles.fontOption, { borderColor: settings.fontFamily === fontFamily ? colors.accent : colors.line, backgroundColor: settings.fontFamily === fontFamily ? colors.inset : 'transparent' }]}>
                      <Text style={[styles.fontName, { color: colors.foreground, fontFamily: fontFamily === 'serif' ? serif : undefined }]}>{fontFamily === 'serif' ? 'Littéraire' : 'Essentielle'}</Text>
                      {settings.fontFamily === fontFamily && <Check size={16} color={colors.accent} />}
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.settingLabel, { color: colors.muted }]}>INTERLIGNE</Text>
                <View style={styles.fontRow}>
                  {[1.5, 1.8, 2.1].map((lineHeight, index) => (
                    <Pressable key={lineHeight} accessibilityRole="radio" accessibilityState={{ checked: settings.lineHeight === lineHeight }} onPress={() => changeSettings({ lineHeight })} style={[styles.lineOption, { borderColor: settings.lineHeight === lineHeight ? colors.accent : colors.line, backgroundColor: settings.lineHeight === lineHeight ? colors.inset : 'transparent' }]}>
                      <Text style={[styles.lineName, { color: colors.foreground }]}>{['Compact', 'Confort', 'Aéré'][index]}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <>
                <View style={[styles.tabs, { borderColor: colors.line }]}>
                  {(['chapters', 'bookmarks'] as const).map(tab => (
                    <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: contentsTab === tab }} onPress={() => setContentsTab(tab)} style={[styles.tab, { borderBottomColor: contentsTab === tab ? colors.accent : 'transparent' }]}>
                      <Text style={[styles.tabLabel, { color: contentsTab === tab ? colors.accent : colors.muted }]}>{tab === 'chapters' ? 'Sommaire' : `Marque-pages (${book.bookmarks.length})`}</Text>
                    </Pressable>
                  ))}
                </View>
                <ScrollView style={styles.contentsScroll} contentContainerStyle={styles.contentsList}>
                  {contentsTab === 'chapters' ? book.chapters.map((item, index) => (
                    <Pressable key={`${item.id}-${index}`} accessibilityRole="button" accessibilityState={{ selected: index === chapterIndex }} onPress={() => goTo(index)} style={[styles.chapterItem, { backgroundColor: index === chapterIndex ? colors.inset : 'transparent' }]}>
                      <Text style={[styles.chapterNumber, { color: colors.muted }]}>{String(index + 1).padStart(2, '0')}</Text>
                      <Text style={[styles.chapterName, { color: colors.foreground }]}>{item.title}</Text>
                      {index === chapterIndex && <View style={[styles.currentDot, { backgroundColor: colors.accent }]} />}
                    </Pressable>
                  )) : orderedBookmarks.length ? orderedBookmarks.map(mark => (
                    <View key={mark.id} style={[styles.bookmarkItem, { borderColor: colors.line }]}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Reprendre au marque-page ${mark.label}`} onPress={() => goTo(mark.chapterIndex, mark.scroll)} style={styles.bookmarkTarget}>
                        <BookmarkIcon size={18} color={colors.accent} strokeWidth={1.6} />
                        <View style={styles.bookmarkTextGroup}>
                          <Text style={[styles.bookmarkTitle, { color: colors.foreground }]} numberOfLines={2}>{mark.label}</Text>
                          <Text style={[styles.bookmarkDetail, { color: colors.muted }]}>Chapitre {mark.chapterIndex + 1} · {Math.round(mark.scroll * 100)} %</Text>
                        </View>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Supprimer le marque-page ${mark.label}`} onPress={() => onRemoveBookmark(mark.id)} style={styles.iconButton}><Trash2 size={17} color={colors.muted} /></Pressable>
                    </View>
                  )) : (
                    <View style={styles.emptyBookmarks}>
                      <BookmarkIcon size={30} color={colors.muted} strokeWidth={1.2} />
                      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Gardez une page pour plus tard</Text>
                      <Text style={[styles.emptyDescription, { color: colors.muted }]}>Touchez le marque-page en haut de l’écran pendant votre lecture.</Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 6, borderBottomWidth: 1 },
  backButton: { minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backText: { fontSize: 13, fontWeight: '500' },
  titleGroup: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  bookTitle: { fontSize: 14, fontWeight: '600' },
  author: { fontSize: 10, marginTop: 2, letterSpacing: 0.25 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  footerIconButton: { minHeight: 32, height: 32 },
  document: { flex: 1, minHeight: 0 },
  footer: { borderTopWidth: 1, paddingHorizontal: 8, paddingVertical: 0, height: 35, minHeight: 35, maxHeight: 35, flexGrow: 0, flexShrink: 0 },
  positionGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  progressLabel: { fontSize: 9, fontVariant: ['tabular-nums'] },
  progressTrack: { height: 2, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 2 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 32, minHeight: 32, maxHeight: 32, flexShrink: 0 },
  toolButton: { minHeight: 32, height: 32, minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  toolText: { fontSize: 12 },
  chapterControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chapterCount: { fontSize: 12, minWidth: 42, textAlign: 'center', fontVariant: ['tabular-nums'] },
  disabled: { opacity: 0.3 },
  modalOverlay: { flex: 1, backgroundColor: '#0B17185C', alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 620, maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 28, paddingRight: 16, paddingTop: 18, paddingBottom: 8 },
  sheetTitle: { fontSize: 24, fontFamily: serif },
  settingsContent: { paddingHorizontal: 28, paddingBottom: 30 },
  settingLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, marginTop: 22, marginBottom: 13 },
  themeRow: { flexDirection: 'row', gap: 12 },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 12 },
  themeSample: { fontSize: 27, fontFamily: serif, marginBottom: 7 },
  themeName: { fontSize: 12 },
  adjuster: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 4 },
  adjustButton: { minWidth: 58, minHeight: 52, justifyContent: 'center', alignItems: 'center' },
  adjustValue: { fontSize: 15, fontVariant: ['tabular-nums'] },
  fontRow: { flexDirection: 'row', gap: 10 },
  fontOption: { flex: 1, minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  fontName: { fontSize: 15 },
  lineOption: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  lineName: { fontSize: 12 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 24, marginTop: 10 },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2 },
  tabLabel: { fontSize: 13, fontWeight: '500' },
  contentsScroll: { maxHeight: 440 },
  contentsList: { paddingHorizontal: 14, paddingVertical: 16 },
  chapterItem: { flexDirection: 'row', alignItems: 'center', minHeight: 58, gap: 16, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 10 },
  chapterNumber: { fontSize: 11, fontVariant: ['tabular-nums'] },
  chapterName: { flex: 1, fontSize: 14, lineHeight: 21 },
  currentDot: { width: 6, height: 6, borderRadius: 3 },
  bookmarkItem: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, marginHorizontal: 10 },
  bookmarkTarget: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 17 },
  bookmarkTextGroup: { flex: 1 },
  bookmarkTitle: { fontSize: 14, lineHeight: 21 },
  bookmarkDetail: { fontSize: 11, marginTop: 5 },
  emptyBookmarks: { paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' },
  emptyTitle: { marginTop: 17, fontSize: 17, textAlign: 'center', fontFamily: serif },
  emptyDescription: { marginTop: 10, fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 300 },
  emptyMessage: { padding: 40, fontSize: 16 },
});
