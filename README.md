# Lisière Compact

Liseuse EPUB en français : bibliothèque locale, favoris, marque-pages, barres compactes et pincement à deux doigts pour régler la taille des caractères.

La version **1.4.0** ajoute :

- **Livres gratuits** : recherche par titre ou auteur dans le catalogue officiel du Projet Gutenberg, filtre de langue, pagination et téléchargement d’un EPUB directement dans la bibliothèque.
- **Import local multiple** : sélection de plusieurs fichiers EPUB en une fois, détection des doublons et récapitulatif des fichiers importés ou en erreur. Une erreur ne bloque pas les autres fichiers.

Les livres importés se lisent ensuite hors ligne, sans compte. Pour agrandir le texte, écarter deux doigts dans la page de lecture ; pour le réduire, les rapprocher. La taille choisie est mémorisée.

## Installer

Télécharger l’APK dans les [releases](https://github.com/Zachiran42/lisiere-compact/releases). La version 1.4.0 porte le code Android 6 et l’identifiant `app.lisiere.reader.compact`. Elle met à jour Compact 1.2, 1.3 et 1.3.1 avec le même certificat : installer par-dessus, sans désinstaller, pour conserver la bibliothèque.

L’application Lisière 1.1 d’origine utilise un identifiant différent. Ses livres ne sont pas transférés automatiquement. Garder une copie des EPUB : effacer les données ou désinstaller l’application supprime sa bibliothèque.

EPUB à texte adaptable, sans DRM ; limite de 40 Mo par fichier. Android 7.0 ou plus récent avec Android System WebView. Un accès Internet est nécessaire pour explorer Gutenberg et télécharger un nouveau livre.

## Développer l’interface distribuée

Le chemin de construction de l’APK est **`web/index.html` + `android-wrapper/`**. Aucun gestionnaire de dépendances n’est nécessaire pour ces commandes, avec Node.js installé :

```sh
node scripts/build-web-features.cjs
node --test tests/features.test.cjs
node scripts/preview.cjs
```

Ouvrir `http://127.0.0.1:8768/web/index.html`. Ce serveur local fournit aussi le transport Gutenberg utilisé pour l’aperçu. Le stockage du navigateur est séparé de celui d’Android. Un simple serveur statique permet la lecture et l’import local, mais ne fournit pas le téléchargement Gutenberg.

| Chemin | Rôle |
| --- | --- |
| `web/base-1.3.html` | Interface de référence 1.3, avec bibliothèque à tranches et lecteur à pincement |
| `web/features/imports.js` | Import multiple, empreinte des livres et détection des doublons |
| `web/features/gutenberg.js` | Recherche, lecture des flux OPDS et limites des téléchargements |
| `web/features/catalogue.js` | Catalogue et récapitulatif accessibles, sans dépendance ajoutée |
| `scripts/build-web-features.cjs` | Intégration reproductible des modules lisibles au bundle de référence |
| `web/index.html` | HTML autonome généré et embarqué dans l’APK |
| `android-wrapper/` | WebView Android, sélecteur multiple et transport HTTPS Gutenberg |
| `scripts/build-android.py` | Construction et signature Android, Windows/macOS/Linux |
| `tests/` | Tests du lecteur, du parseur EPUB, des imports et du transport |
| `docs/VALIDATION-1.4.md` | Vérifications et limites de la livraison |

Voir [la provenance des sources](docs/SOURCE-PROVENANCE.md). `App.tsx` et `src/` sont également conservés : ils proviennent d’une interface Expo antérieure. Un export Expo ne reproduit pas le HTML actuellement distribué et n’inclut pas les modules du catalogue 1.4. Pour développer cette référence Expo : `npm ci`, `npm run web`, `npm test` et `npm run typecheck`.

## Construire Android

JDK 17, Python 3.11+, Android SDK Platform 35 et Build Tools 35.0.0. Définir `JAVA_HOME`, `LISIERE_ANDROID_SDK`, `LISIERE_KEYSTORE` (hors du dépôt) et `LISIERE_KEYSTORE_PASSWORD`, puis :

```sh
python scripts/build-android.py
```

Le résultat est `release/Lisiere-Compact-1.4.0.apk`. Les signatures v2/v3 et l’alignement sont vérifiés. Utiliser la même clé privée pour mettre à jour une installation existante. Aucun secret ni clé de signature n’est publié. Plus de détails : [enveloppe Android](android-wrapper/README.md).

## Catalogue et confidentialité

L’application utilise les [flux OPDS officiels destinés aux applications](https://www.gutenberg.org/ebooks/offline_catalogs.html), sans parcourir automatiquement les pages HTML du site. Les recherches et téléchargements demandés sont transmis au Projet Gutenberg. Les EPUB locaux, favoris et positions de lecture ne sont pas envoyés à un serveur.

Le transport Android est limité aux flux OPDS et aux EPUB HTTPS de Gutenberg, y compris après redirection. Les autres ressources réseau de la WebView restent bloquées. Les livres passent par le même parseur et la même isolation de lecture que les imports locaux. Aucune clé API, compte ou serveur tiers n’est nécessaire.

Seuls les fichiers annoncés « Public domain in the USA » sont proposés au téléchargement automatique. Les autres renvoient vers la fiche et ses conditions. Le statut américain ne garantit pas le domaine public dans tous les pays ; consulter la fiche et les règles locales. Les mentions et licences Gutenberg présentes dans les EPUB sont conservées. Les flux OPDS XML sont annoncés comme pouvant évoluer vers OPDS 2 en 2027 : l’adaptateur du catalogue devra suivre cette évolution.

## Licence

Le code original est sous [licence MIT](LICENSE), copyright © 2026 Zachiran42. Les dépendances conservent leurs licences et notices, incluses dans l’APK : [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt). La licence du logiciel ne confère aucun droit sur les livres.
