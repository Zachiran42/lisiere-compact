import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowDownAZ, ArrowRight, BookOpen, Check, ChevronRight, Heart, Leaf,
  Library, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Trash2, X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { loadState, saveState } from './src/storage';
import { pickEpub } from './src/importBook';
import { createSamples } from './src/samples';
import { AppState, DEFAULT_SETTINGS, LibraryBook, ReadingSettings, bookProgress } from './src/types';
import BookCover from './src/BookCover';
import Reader from './src/reader/Reader';
import { colors as c, serif } from './src/theme';

type Tab = 'library' | 'favorites' | 'settings';
type Filter = 'all' | 'reading' | 'finished';

function Action({ children, onPress, label, secondary = false, disabled = false }: {
  children: React.ReactNode; onPress: () => void; label?: string; secondary?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.action, secondary && s.actionSecondary, pressed && { opacity: 0.75 }, disabled && { opacity: 0.5 }]}>
    {children}
  </Pressable>;
}

function IconButton({ icon: Icon, label, onPress, color = c.ink }: { icon: LucideIcon; label: string; onPress: () => void; color?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.iconButton, pressed && { backgroundColor: c.pale }]}>
    <Icon size={21} color={color} strokeWidth={1.7} />
  </Pressable>;
}

function AppContent() {
  const { width } = useWindowDimensions();
  const desktop = width >= 950;
  const [state, setState] = useState<AppState>({ books: [], settings: DEFAULT_SETTINGS });
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [tab, setTab] = useState<Tab>('library');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sortAlpha, setSortAlpha] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState('');

  const initialize = useCallback(async () => {
    setLoadError('');
    try {
      const saved = await loadState();
      setState(saved ?? { books: createSamples(), settings: DEFAULT_SETTINGS });
      setReady(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Impossible de charger votre bibliothèque.');
    }
  }, []);

  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => {
    if (!ready) return;
    void saveState(state).then(() => setSaveError('')).catch(() => setSaveError('La sauvegarde a échoué. Vérifiez l’espace disponible avant de fermer l’application.'));
  }, [state, ready]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const back = (event: Event) => {
      // The reader owns its own panel and reading-position handling.
      if (selectedId) return;
      if (detailsId) { event.preventDefault(); setDetailsId(null); }
      else if (tab !== 'library') { event.preventDefault(); setTab('library'); }
    };
    window.addEventListener('lisiere-native-back', back);
    return () => window.removeEventListener('lisiere-native-back', back);
  }, [selectedId, detailsId, tab]);

  const updateBook = useCallback((id: string, update: Partial<LibraryBook> | ((b: LibraryBook) => LibraryBook)) => {
    setState(prev => ({ ...prev, books: prev.books.map(b => b.id === id ? (typeof update === 'function' ? update(b) : { ...b, ...update }) : b) }));
  }, []);
  const updateSettings = useCallback((settings: ReadingSettings) => setState(prev => ({ ...prev, settings })), []);
  const openBook = (book: LibraryBook) => {
    updateBook(book.id, { lastOpenedAt: Date.now() });
    setDetailsId(null);
    setSelectedId(book.id);
  };
  const importBook = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const book = await pickEpub();
      if (!book) return;
      if (state.books.some(existing => existing.id === book.id)) {
        setNotice('Ce livre est déjà dans votre bibliothèque.');
        return;
      }
      setState(prev => ({ ...prev, books: prev.books.some(b => b.id === book.id) ? prev.books : [book, ...prev.books] }));
      setTab('library'); setFilter('all'); setQuery('');
      setNotice(`« ${book.title} » a rejoint votre bibliothèque.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible d’importer ce livre.');
    } finally { setImporting(false); }
  };

  const selected = state.books.find(b => b.id === selectedId);
  const detailBook = state.books.find(b => b.id === detailsId);
  const latest = useMemo(() => [...state.books].filter(b => !b.finished).sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0))[0] || state.books[0], [state.books]);
  const books = useMemo(() => {
    const search = query.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return state.books.filter(b => {
      if (tab === 'favorites' && !b.favorite) return false;
      if (filter === 'reading' && (!b.lastOpenedAt || b.finished)) return false;
      if (filter === 'finished' && !b.finished) return false;
      const text = `${b.title} ${b.author}`.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return !search || text.includes(search);
    }).sort((a, b) => sortAlpha ? a.title.localeCompare(b.title, 'fr') : b.addedAt - a.addedAt);
  }, [state.books, tab, filter, query, sortAlpha]);

  if (!ready) return <SafeAreaView style={s.loading}>
    <Leaf color={c.green} size={34} />
    <Text style={s.wordmark}>Lisière</Text>
    {loadError ? <><Text style={s.error}>{loadError}</Text><Action onPress={() => void initialize()}><Text style={s.actionText}>Réessayer</Text></Action></> : <ActivityIndicator color={c.green} accessibilityLabel="Chargement de la bibliothèque" />}
  </SafeAreaView>;

  if (selected) return <View style={{ flex: 1 }}>
    <StatusBar style={state.settings.theme === 'night' ? 'light' : 'dark'} />
    {saveError ? <Text accessibilityRole="alert" style={s.warning}>{saveError}</Text> : null}
    <Reader key={selected.id} book={selected} settings={state.settings} onClose={() => setSelectedId(null)}
      onProgress={(chapterIndex, scroll) => updateBook(selected.id, { chapterIndex, scroll })}
      onSettings={updateSettings}
      onBookmark={bookmark => updateBook(selected.id, b => ({ ...b, bookmarks: [...b.bookmarks, bookmark] }))}
      onRemoveBookmark={id => updateBook(selected.id, b => ({ ...b, bookmarks: b.bookmarks.filter(bm => bm.id !== id) }))}
      onFinished={() => { updateBook(selected.id, { finished: true, chapterIndex: selected.chapters.length - 1, scroll: 1 }); setNotice('Une belle lecture de plus. Livre marqué comme terminé.'); }} />
  </View>;

  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: 'library', label: 'Bibliothèque', icon: Library },
    { key: 'favorites', label: 'Favoris', icon: Heart },
    { key: 'settings', label: 'Réglages', icon: Settings },
  ];

  const navigation = (sidebar: boolean) => <View style={sidebar ? s.sideNav : s.bottomNav}>
    {tabs.map(({ key, label, icon: Icon }) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} onPress={() => { setTab(key); setFilter('all'); setQuery(''); }}
      style={({ pressed }) => [sidebar ? s.sideTab : s.bottomTab, tab === key && (sidebar ? s.sideTabActive : {}), pressed && { opacity: 0.7 }]}>
      <Icon size={sidebar ? 20 : 18} strokeWidth={tab === key ? 2 : 1.6} color={tab === key ? c.green : c.muted} fill={key === 'favorites' && tab === key ? c.pale : 'none'} />
      <Text style={[sidebar ? s.sideTabText : s.bottomTabText, tab === key && { color: c.green, fontWeight: '700' }]}>{label}</Text>
      {sidebar && key === 'library' && <Text style={s.navCount}>{state.books.length}</Text>}
    </Pressable>)}
  </View>;

  return <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
    <StatusBar style="dark" />
    <View style={s.shell}>
      {desktop && <View style={s.sidebar}>
        <View style={s.brand}><Leaf size={27} color={c.green} strokeWidth={1.5} /><Text style={s.wordmark}>Lisière</Text><View style={s.brandDot} /></View>
        <Text style={s.tagline}>LE TEMPS DE LIRE.</Text>
        {navigation(true)}
        <View style={s.sideBottom}><View style={s.offlineDot} /><Text style={s.smallMuted}>Votre bibliothèque, avec vous.</Text></View>
      </View>}
      <View style={s.main}>
        <View style={[s.topbar, !desktop && { paddingHorizontal: 22 }]}>
          {desktop ? <Text style={s.breadcrumb}>Mon espace <Text style={{ color: '#ADB2A8' }}> / </Text> {tab === 'library' ? 'Bibliothèque' : tab === 'favorites' ? 'Favoris' : 'Réglages'}</Text>
            : <View style={s.brand}><Leaf size={25} color={c.green} strokeWidth={1.5} /><Text style={[s.wordmark, { fontSize: 28 }]}>Lisière</Text><View style={s.brandDot} /></View>}
          <View style={s.topRight}>
            {desktop && <Text style={s.topNote}>Un livre. Un moment pour soi.</Text>}
            <Action onPress={() => void importBook()} label="Importer un EPUB" disabled={importing}>
              {importing ? <ActivityIndicator size="small" color="white" /> : <Plus size={18} color="white" />}
              <Text style={s.actionText}>{importing ? 'Import…' : desktop ? 'Importer un livre' : 'Importer'}</Text>
            </Action>
          </View>
        </View>
        {saveError ? <Text accessibilityRole="alert" style={s.warning}>{saveError}</Text> : null}
        <ScrollView contentContainerStyle={[s.content, !desktop && { padding: 22, paddingTop: 29 }]} keyboardShouldPersistTaps="handled">
          {tab === 'settings' ? <SettingsPage settings={state.settings} onChange={updateSettings} /> : <>
            <Text style={s.eyebrow}>{tab === 'favorites' ? 'LES LIVRES QUI RESTENT' : 'VOTRE PARENTHÈSE À VOUS'}</Text>
            <Text style={[s.heading, !desktop && { fontSize: 34, lineHeight: 42 }]}>{tab === 'favorites' ? 'Vos coups de cœur.' : 'Et si on tournait une page ?'}</Text>
            <Text style={s.subtitle}>{tab === 'favorites' ? 'Retrouvez les histoires que vous aimez garder près de vous.' : 'Vos histoires vous attendent. Prenez le temps de vous y perdre.'}</Text>

            {tab === 'library' && latest && <View style={[s.heroRow, !desktop && { marginTop: 28 }]}>
              <View style={[s.hero, !desktop && { padding: 22, paddingVertical: 26 }]}>
                <View style={[s.heroCover, !desktop && { width: 100, height: 155 }]}><BookCover book={latest} compact /></View>
                <View style={s.heroContent}>
                  <View style={s.heroLabel}><View style={s.offlineDot} /><Text style={[s.eyebrow, { fontSize: 9, letterSpacing: 1.8 }]}>{latest.lastOpenedAt && !latest.finished ? 'REPRENDRE LE FIL' : 'UNE HISTOIRE VOUS ATTEND'}</Text></View>
                  <Text numberOfLines={3} style={[s.heroTitle, !desktop && { fontSize: 23, lineHeight: 29 }]}>{latest.title}</Text>
                  <Text numberOfLines={2} style={s.heroAuthor}>{latest.author}</Text>
                  {latest.lastOpenedAt && !latest.finished ? <View style={s.heroProgress}>
                    <View style={s.progressTrack}><View style={[s.progressFill, { width: `${bookProgress(latest)}%` }]} /></View>
                    <Text style={s.smallMuted}>{bookProgress(latest)} % lu · Chapitre {latest.chapterIndex + 1}</Text>
                  </View> : <Text style={[s.heroDescription, !desktop && { display: 'none' }]}>{latest.sample ? 'Une courte histoire originale, pour apprivoiser votre nouvelle liseuse.' : `${latest.chapters.length} chapitres à découvrir, à votre rythme.`}</Text>}
                  <Pressable accessibilityRole="button" onPress={() => openBook(latest)} style={({ pressed }) => [s.readLink, pressed && { opacity: 0.6 }]}>
                    <Text style={s.readLinkText}>{latest.lastOpenedAt && !latest.finished ? 'Continuer la lecture' : 'Ouvrir le livre'}</Text><ArrowRight size={18} color={c.green} />
                  </Pressable>
                </View>
              </View>
              {desktop && <View style={s.quoteCard}><BookOpen size={29} color="#888F74" strokeWidth={1.2} /><Text style={s.quote}>Il suffit parfois{`\n`}de quelques pages{`\n`}pour être ailleurs.</Text><View style={s.quoteLine} /><Text style={s.quoteCaption}>INSTALLEZ-VOUS. RESPIREZ. LISEZ.</Text></View>}
            </View>}

            <View style={s.sectionHeader}><View style={s.sectionTitleRow}><Text style={s.sectionTitle}>{tab === 'favorites' ? 'Mes favoris' : 'Ma bibliothèque'}</Text><Text style={s.countPill}>{books.length}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel={sortAlpha ? 'Trier par ajout récent' : 'Trier par titre'} onPress={() => setSortAlpha(v => !v)} style={s.sortButton}><ArrowDownAZ size={17} color={c.muted} />{desktop && <Text style={s.sortText}>{sortAlpha ? 'Par titre' : 'Ajouts récents'}</Text>}</Pressable>
            </View>
            <View style={[s.filterRow, !desktop && { flexWrap: 'wrap', gap: 14 }]}>
              <View style={s.filters}>
                {([{ key: 'all', label: 'Tous' }, { key: 'reading', label: 'En cours' }, { key: 'finished', label: 'Terminés' }] as const).map(f => <Pressable key={f.key} accessibilityRole="button" accessibilityState={{ selected: filter === f.key }} onPress={() => setFilter(f.key)} style={[s.filter, filter === f.key && s.filterActive]}><Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text></Pressable>)}
              </View>
              <View style={[s.search, !desktop && { width: '100%' }]}><Search size={17} color={c.muted} /><TextInput accessibilityLabel="Rechercher un livre ou un auteur" placeholder="Rechercher un livre, un auteur…" placeholderTextColor="#93998F" value={query} onChangeText={setQuery} style={s.searchInput} />{query ? <IconButton icon={X} label="Effacer la recherche" onPress={() => setQuery('')} /> : null}</View>
            </View>
            <View style={[s.grid, { gap: desktop ? 26 : 18 }]}>
              {books.map(book => <View key={book.id} style={[s.bookCard, { width: desktop ? '22%' : width > 600 ? '30%' : '46.9%' }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Lire ${book.title}`} onPress={() => openBook(book)} style={({ pressed }) => [s.coverWrap, pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }]}>
                  <BookCover book={book} compact={!desktop} />
                  {book.finished && <View style={s.finishedBadge}><Check size={12} color={c.green} /><Text style={s.finishedText}>Lu</Text></View>}
                </Pressable>
                <View style={s.bookHeading}><Text numberOfLines={2} style={s.bookTitle}>{book.title}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Options pour ${book.title}`} onPress={() => { setDetailsId(book.id); setConfirmDelete(false); }} style={s.moreButton}><MoreHorizontal size={20} color={c.muted} /></Pressable></View>
                <Text numberOfLines={1} style={s.bookAuthor}>{book.author}</Text>
                <View style={s.bookFooter}>{book.favorite && <Heart size={12} fill={c.green} color={c.green} />}{book.lastOpenedAt ? <><View style={[s.progressTrack, { flex: 1 }]}><View style={[s.progressFill, { width: `${bookProgress(book)}%` }]} /></View><Text style={s.percent}>{bookProgress(book)} %</Text></> : <Text style={s.newLabel}>{book.sample ? 'À découvrir · Extrait original' : 'À découvrir'}</Text>}</View>
              </View>)}
              {tab === 'library' && !query && filter === 'all' && <Pressable accessibilityRole="button" accessibilityLabel="Ajouter un fichier EPUB" onPress={() => void importBook()} disabled={importing} style={[s.importCard, { width: desktop ? '22%' : width > 600 ? '30%' : '46.9%' }]}><View style={s.importIcon}><Plus size={24} color="#86937E" strokeWidth={1.4} /></View><Text style={s.importTitle}>Une nouvelle histoire ?</Text><Text style={s.importCaption}>Ajoutez votre fichier EPUB</Text></Pressable>}
            </View>
            {!books.length && <View style={s.empty}><BookOpen size={38} strokeWidth={1.2} color="#9CA88F" /><Text style={s.emptyTitle}>{query ? 'Aucun livre trouvé' : tab === 'favorites' ? 'Vos favoris vous attendent' : filter === 'reading' ? 'Le début d’une nouvelle histoire' : filter === 'finished' ? 'Chaque livre a son rythme' : 'Votre bibliothèque prend vie'}</Text><Text style={s.emptyText}>{query ? 'Essayez un autre titre ou un nom d’auteur.' : tab === 'favorites' ? 'Ajoutez un cœur à un livre depuis son menu pour le retrouver ici.' : filter === 'reading' ? 'Ouvrez un livre : vous le retrouverez ensuite ici.' : filter === 'finished' ? 'Vos livres terminés apparaîtront ici.' : 'Importez votre premier fichier EPUB pour commencer.'}</Text></View>}
            <View style={s.libraryFooter}><ShieldCheck size={14} color="#929B89" /><Text style={s.footerText}>Vos livres restent sur cet appareil. Votre lecture aussi.</Text></View>
          </>}
        </ScrollView>
        {!desktop && <SafeAreaView testID="app-bottom-nav" edges={['bottom']} style={s.bottomSafe}>{navigation(false)}</SafeAreaView>}
      </View>
    </View>
    {notice ? <View accessibilityLiveRegion="polite" style={[s.notice, !desktop && { bottom: 46, left: 16, right: 16 }]}><Text style={s.noticeText}>{notice}</Text><IconButton icon={X} label="Fermer le message" onPress={() => setNotice('')} color="white" /></View> : null}
    <Modal visible={!!detailBook} transparent animationType="fade" onRequestClose={() => setDetailsId(null)}>
      <View style={s.modalOverlay}><Pressable accessibilityLabel="Fermer les options" style={StyleSheet.absoluteFill} onPress={() => setDetailsId(null)} /><View accessibilityViewIsModal style={s.modalCard}>
        {detailBook && <><View style={s.modalTop}><Text style={s.modalTitle}>{confirmDelete ? 'Retirer ce livre ?' : detailBook.title}</Text><IconButton icon={X} label="Fermer les options" onPress={() => setDetailsId(null)} /></View>
          {confirmDelete ? <><Text style={s.modalDescription}>« {detailBook.title} » et ses marque-pages seront retirés de cette bibliothèque. Le fichier EPUB d’origine reste intact.</Text><Action onPress={() => { setState(prev => ({ ...prev, books: prev.books.filter(b => b.id !== detailBook.id) })); setDetailsId(null); setNotice('Livre retiré de la bibliothèque.'); }}><Trash2 size={17} color="white" /><Text style={s.actionText}>Retirer de la bibliothèque</Text></Action><Action secondary onPress={() => setConfirmDelete(false)}><Text style={s.secondaryText}>Garder le livre</Text></Action></> : <>
            <Text style={s.modalDescription}>{detailBook.author} · {detailBook.chapters.length} chapitres{detailBook.sample ? '\nTexte original de démonstration' : ''}</Text>
            <MenuItem icon={BookOpen} label="Ouvrir le livre" onPress={() => openBook(detailBook)} />
            <MenuItem icon={Heart} label={detailBook.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onPress={() => updateBook(detailBook.id, { favorite: !detailBook.favorite })} active={detailBook.favorite} />
            <MenuItem icon={Check} label={detailBook.finished ? 'Marquer comme non terminé' : 'Marquer comme terminé'} onPress={() => updateBook(detailBook.id, { finished: !detailBook.finished })} active={detailBook.finished} />
            {!!detailBook.lastOpenedAt && <MenuItem icon={ArrowRight} label="Recommencer au début" onPress={() => { updateBook(detailBook.id, { chapterIndex: 0, scroll: 0, finished: false, lastOpenedAt: Date.now() }); setDetailsId(null); setSelectedId(detailBook.id); }} />}
            <View style={s.divider} /><MenuItem icon={Trash2} label="Retirer de la bibliothèque" onPress={() => setConfirmDelete(true)} destructive />
          </>}
        </>}
      </View></View>
    </Modal>
  </SafeAreaView>;
}

function MenuItem({ icon: Icon, label, onPress, active, destructive }: { icon: LucideIcon; label: string; onPress: () => void; active?: boolean; destructive?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.menuItem, pressed && { backgroundColor: c.bg }]}><Icon size={20} strokeWidth={1.6} color={destructive ? '#A34D3E' : c.green} /><Text style={[s.menuLabel, destructive && { color: '#A34D3E' }]}>{label}</Text>{active ? <Check size={16} color={c.green} /> : <ChevronRight size={16} color="#A3AA9D" />}</Pressable>;
}

function SettingsPage({ settings, onChange }: { settings: ReadingSettings; onChange: (s: ReadingSettings) => void }) {
  return <View style={s.settingsPage}>
    <Text style={s.eyebrow}>À VOTRE FAÇON</Text><Text style={s.heading}>Le confort de lire.</Text><Text style={s.subtitle}>Une liseuse qui s’adapte à vos envies.</Text>
    <View style={s.settingsCard}>
      <Text style={s.settingsTitle}>Votre page idéale</Text><Text style={s.settingsHint}>Ces préférences s’appliquent à tous vos livres.</Text>
      <Text style={s.settingsLabel}>Ambiance</Text><View style={s.settingOptions}>{([{ key: 'paper', label: 'Papier', bg: '#FFFEFA', text: c.ink }, { key: 'sepia', label: 'Sépia', bg: '#F1E6D0', text: '#564832' }, { key: 'night', label: 'Nuit', bg: '#1D2722', text: '#E5E8DB' }] as const).map(t => <Pressable key={t.key} accessibilityRole="button" accessibilityLabel={`Thème ${t.label}`} accessibilityState={{ selected: settings.theme === t.key }} onPress={() => onChange({ ...settings, theme: t.key })} style={[s.themeChoice, { backgroundColor: t.bg }, settings.theme === t.key && { borderColor: c.green }]}><Text style={{ fontFamily: serif, fontSize: 26, color: t.text }}>Aa</Text><Text style={{ color: t.text, fontSize: 12 }}>{t.label}</Text></Pressable>)}</View>
      <Text style={s.settingsLabel}>Taille du texte</Text><View style={s.fontRow}><Action secondary disabled={settings.fontSize <= 14} label="Réduire le texte" onPress={() => onChange({ ...settings, fontSize: Math.max(14, settings.fontSize - 2) })}><Text style={s.secondaryText}>A−</Text></Action><Text style={s.fontValue}>{settings.fontSize} px</Text><Action secondary disabled={settings.fontSize >= 32} label="Agrandir le texte" onPress={() => onChange({ ...settings, fontSize: Math.min(32, settings.fontSize + 2) })}><Text style={s.secondaryText}>A+</Text></Action></View>
      <Text style={s.settingsLabel}>Police de lecture</Text><View style={s.settingOptions}>{([{ key: 'serif', label: 'Littéraire' }, { key: 'sans', label: 'Épurée' }] as const).map(font => <Pressable key={font.key} accessibilityRole="button" accessibilityState={{ selected: settings.fontFamily === font.key }} onPress={() => onChange({ ...settings, fontFamily: font.key })} style={[s.fontChoice, settings.fontFamily === font.key && s.choiceActive]}><Text style={{ color: c.ink, fontFamily: font.key === 'serif' ? serif : undefined, fontSize: 18 }}>{font.label}</Text></Pressable>)}</View>
      <View style={[s.preview, { backgroundColor: settings.theme === 'night' ? '#1D2722' : settings.theme === 'sepia' ? '#F1E6D0' : '#FFFEFA' }]}><Text style={{ fontFamily: settings.fontFamily === 'serif' ? serif : undefined, fontSize: settings.fontSize, lineHeight: settings.fontSize * settings.lineHeight, color: settings.theme === 'night' ? '#E5E8DB' : c.ink }}>La lumière passait entre les feuilles. Pour une fois, rien ne pressait.</Text></View>
    </View>
    <View style={s.aboutCard}><ShieldCheck size={25} color={c.green} strokeWidth={1.5} /><View style={{ flex: 1 }}><Text style={s.aboutTitle}>Un petit espace, rien qu’à vous.</Text><Text style={s.aboutText}>Vos EPUB et votre progression sont conservés sur cet appareil, sans compte et sans envoi à un serveur. Les livres importés sont lisibles hors ligne dans l’application mobile.</Text><Text style={s.aboutText}>Gardez une copie de vos fichiers EPUB : supprimer les données de l’application ou du navigateur efface la bibliothèque. Les EPUB à texte adaptable, sans DRM, sont pris en charge.</Text><Text style={s.version}>LISIÈRE · VERSION 1.3 COMPACT</Text></View></View>
  </View>;
}

export default function App() { return <SafeAreaProvider><AppContent /></SafeAreaProvider>; }

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg }, shell: { flex: 1, flexDirection: 'row' }, main: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg, gap: 22, padding: 30 },
  error: { color: '#A34D3E', textAlign: 'center', lineHeight: 24 },
  sidebar: { width: 225, backgroundColor: '#F0F2E9', paddingHorizontal: 24, paddingTop: 37, borderRightWidth: 1, borderRightColor: '#E6E9DF' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 }, wordmark: { fontFamily: serif, fontSize: 34, color: c.green, letterSpacing: -1.3 }, brandDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#A9B88C', marginTop: 15, marginLeft: -7 },
  tagline: { color: '#829079', fontSize: 8, letterSpacing: 2.1, marginTop: 12, marginLeft: 38 },
  sideNav: { gap: 9, marginTop: 61 }, sideTab: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, marginHorizontal: -9, borderRadius: 7 }, sideTabActive: { backgroundColor: '#E1E8D8' }, sideTabText: { fontSize: 13, color: c.muted }, navCount: { color: c.green, marginLeft: 'auto', fontSize: 11 },
  sideBottom: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 'auto', marginBottom: 28 },
  topbar: { minHeight: 95, paddingHorizontal: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: '#E7E9E0', borderBottomWidth: 1, gap: 12 },
  breadcrumb: { fontSize: 11, color: c.muted }, topRight: { flexDirection: 'row', alignItems: 'center', gap: 24 }, topNote: { fontSize: 11, color: c.muted },
  action: { minHeight: 43, paddingHorizontal: 17, paddingVertical: 11, backgroundColor: c.green, borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionSecondary: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.border }, actionText: { color: 'white', fontSize: 12, fontWeight: '600' }, secondaryText: { color: c.green, fontWeight: '600', fontSize: 14 },
  iconButton: { minWidth: 42, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  content: { padding: 46, paddingTop: 39, paddingBottom: 32, width: '100%', maxWidth: 1350, alignSelf: 'center' },
  eyebrow: { fontSize: 9, letterSpacing: 2.2, color: '#738269', fontWeight: '600' }, heading: { fontFamily: serif, fontSize: 40, lineHeight: 49, letterSpacing: -1.2, color: c.ink, marginTop: 12 }, subtitle: { fontSize: 12, lineHeight: 21, color: c.muted, marginTop: 8 },
  heroRow: { flexDirection: 'row', gap: 23, marginTop: 32 }, hero: { flex: 1, backgroundColor: '#EAF0E3', borderRadius: 11, padding: 28, flexDirection: 'row', gap: 26, alignItems: 'center', overflow: 'hidden' }, heroCover: { width: 119, height: 179, transform: [{ rotate: '-6deg' }], shadowColor: '#263D24', shadowOpacity: 0.2, shadowRadius: 9, shadowOffset: { width: 3, height: 7 }, elevation: 5 }, heroContent: { flex: 1, paddingVertical: 5 }, heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 }, offlineDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#8C9D75' }, heroTitle: { fontFamily: serif, color: c.ink, fontSize: 30, lineHeight: 36, marginTop: 13 }, heroAuthor: { fontSize: 11, color: '#7E8974', marginTop: 7, lineHeight: 17 }, heroDescription: { fontSize: 11, lineHeight: 19, color: '#7E8974', marginTop: 14, maxWidth: 270 }, heroProgress: { marginTop: 20, gap: 8, maxWidth: 250 }, readLink: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9, minHeight: 44, marginTop: 10 }, readLinkText: { color: c.green, fontSize: 12, fontWeight: '700' },
  quoteCard: { width: 222, backgroundColor: '#F0EDE3', borderRadius: 11, padding: 25, justifyContent: 'center', alignItems: 'center' }, quote: { textAlign: 'center', fontFamily: serif, fontSize: 20, lineHeight: 29, fontStyle: 'italic', color: '#6E785E', marginTop: 13 }, quoteLine: { backgroundColor: '#BCBEAA', width: 24, height: 1, marginTop: 17, marginBottom: 13 }, quoteCaption: { fontSize: 6, color: '#9A9F8A', letterSpacing: 1.4 },
  sectionHeader: { marginTop: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, sectionTitle: { fontFamily: serif, fontSize: 25, color: c.ink, letterSpacing: -0.4 }, countPill: { fontSize: 10, color: '#7A876C', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#E9EDE1' }, sortButton: { minHeight: 44, minWidth: 44, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'flex-end' }, sortText: { fontSize: 10, color: c.muted },
  filterRow: { marginTop: 17, marginBottom: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }, filters: { flexDirection: 'row', gap: 5 }, filter: { minHeight: 38, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 }, filterActive: { backgroundColor: c.green }, filterText: { color: c.muted, fontSize: 11 }, filterTextActive: { color: 'white', fontWeight: '600' },
  search: { width: 245, minHeight: 39, borderWidth: 1, borderColor: c.border, borderRadius: 6, paddingLeft: 12, paddingRight: 6, flexDirection: 'row', gap: 8, alignItems: 'center' }, searchInput: { flex: 1, fontSize: 10, paddingVertical: 10, color: c.ink, minWidth: 0, ...Platform.select({ web: { outlineStyle: 'none' as never } }) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }, bookCard: { marginBottom: 6 }, coverWrap: { width: '100%', aspectRatio: 0.68, borderRadius: 5, shadowColor: '#4A4C38', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 2, height: 4 }, elevation: 3 },
  bookHeading: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, gap: 1 }, bookTitle: { color: c.ink, fontSize: 13, lineHeight: 20, fontWeight: '600', flex: 1 }, moreButton: { minWidth: 35, minHeight: 36, alignItems: 'center', justifyContent: 'center', marginTop: -7, marginRight: -7 }, bookAuthor: { fontSize: 10, color: c.muted, marginTop: 3 }, bookFooter: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 26, marginTop: 4 }, newLabel: { fontSize: 8, color: '#8A9581' }, percent: { color: '#7A876C', fontSize: 9 },
  progressTrack: { backgroundColor: '#D9E2CF', height: 3, borderRadius: 3, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: '#819971', borderRadius: 3 }, smallMuted: { color: '#88917E', fontSize: 9 }, finishedBadge: { position: 'absolute', right: 8, top: 9, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#F0F3E9', flexDirection: 'row', alignItems: 'center', gap: 4 }, finishedText: { fontSize: 9, color: c.green },
  importCard: { aspectRatio: 0.68, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CDD5C2', borderRadius: 6, justifyContent: 'center', alignItems: 'center', padding: 15, backgroundColor: '#F4F5ED' }, importIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E9EEDF', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }, importTitle: { fontSize: 11, lineHeight: 18, color: '#78896D', textAlign: 'center' }, importCaption: { fontSize: 9, lineHeight: 16, color: '#9AA48E', textAlign: 'center', marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 13, maxWidth: 420, alignSelf: 'center' }, emptyTitle: { fontFamily: serif, fontSize: 24, color: c.ink, textAlign: 'center' }, emptyText: { fontSize: 13, lineHeight: 22, color: c.muted, textAlign: 'center' },
  libraryFooter: { paddingTop: 8, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }, footerText: { fontSize: 9, color: '#939C89', textAlign: 'center' },
  bottomSafe: { backgroundColor: '#FCFCF7', borderTopWidth: 1, borderTopColor: c.border, height: 33, minHeight: 33, maxHeight: 33, flexGrow: 0, flexShrink: 0 }, bottomNav: { flexDirection: 'row', height: 32, minHeight: 32, maxHeight: 32, flexGrow: 0, flexShrink: 0 }, bottomTab: { flex: 1, minHeight: 32, height: 32, maxHeight: 32, paddingVertical: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, bottomTabText: { fontSize: 10, color: c.muted },
  notice: { position: 'absolute', bottom: 24, right: 30, left: 260, maxWidth: 700, alignSelf: 'center', backgroundColor: c.green, borderRadius: 9, padding: 10, paddingLeft: 18, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, noticeText: { flex: 1, color: 'white', fontSize: 12, lineHeight: 20 }, warning: { backgroundColor: '#FFF0D2', color: '#7D5423', fontSize: 12, lineHeight: 20, padding: 12, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: '#11271C65', justifyContent: 'center', alignItems: 'center', padding: 22 }, modalCard: { backgroundColor: c.card, borderRadius: 15, padding: 23, width: '100%', maxWidth: 430, gap: 10 }, modalTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, modalTitle: { fontFamily: serif, fontSize: 25, color: c.ink, flex: 1 }, modalDescription: { fontSize: 12, color: c.muted, lineHeight: 21, marginBottom: 9 }, menuItem: { minHeight: 51, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 7, borderRadius: 5 }, menuLabel: { flex: 1, fontSize: 13, color: c.ink }, divider: { height: 1, backgroundColor: c.border, marginVertical: 4 },
  settingsPage: { maxWidth: 700 }, settingsCard: { marginTop: 30, padding: 25, backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border }, settingsTitle: { fontFamily: serif, fontSize: 25, color: c.ink }, settingsHint: { color: c.muted, fontSize: 12, marginTop: 8, lineHeight: 19 }, settingsLabel: { color: c.ink, fontSize: 12, fontWeight: '600', marginTop: 27, marginBottom: 13 }, settingOptions: { flexDirection: 'row', gap: 12 }, themeChoice: { flex: 1, padding: 14, alignItems: 'center', gap: 7, borderRadius: 8, borderWidth: 2, borderColor: c.border }, fontRow: { flexDirection: 'row', alignItems: 'center', gap: 23 }, fontValue: { color: c.ink, fontSize: 15 }, fontChoice: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 7, padding: 16, alignItems: 'center' }, choiceActive: { borderColor: c.green, backgroundColor: c.pale }, preview: { padding: 23, borderRadius: 8, marginTop: 26 }, aboutCard: { marginTop: 27, flexDirection: 'row', gap: 17, paddingVertical: 8 }, aboutTitle: { fontFamily: serif, color: c.ink, fontSize: 22 }, aboutText: { color: c.muted, fontSize: 12, lineHeight: 22, marginTop: 12 }, version: { color: '#94A087', fontSize: 9, letterSpacing: 2, marginTop: 20 },
});
