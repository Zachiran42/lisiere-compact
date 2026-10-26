# APK Android autonome — Lisière Compact 1.3

Cette enveloppe Android charge le fichier HTML autonome dans la WebView du système. Elle fonctionne hors ligne, sans compte ni permission Android `INTERNET`. L’import EPUB utilise le sélecteur de documents Android. Les livres et préférences restent dans IndexedDB sur l’origine locale `https://appassets.androidplatform.net`.

Android 7.0 (API 24) ou plus récent et Android System WebView sont nécessaires. Cette enveloppe compile une activité Java avec les outils Android ; elle n’utilise ni Gradle ni le moteur React Native natif.

## Construire l’interface distribuée

Par défaut, le script utilise `web/index.html`, la copie autonome exacte de l’interface livrée avec Compact 1.3. Cette reconstruction ne nécessite ni Node.js ni une exportation Expo. Les sources Java de l’enveloppe proviennent de l’archive initiale du projet ; une reconstruction produit un nouvel APK à vérifier sur Android. L’APK 1.3 déjà distribué reste le fichier signé précédemment et sa correspondance binaire avec une reconstruction n’est pas garantie.

Prérequis : Python 3.11+, JDK 17, Bash, Android SDK Platform 35 et Build Tools 35.0.0. Le script accepte un SDK déjà installé. Sous Windows, utiliser Git Bash avec les outils Android pour Windows ; sous Linux ou macOS, utiliser les outils de la plateforme correspondante.

Depuis la racine du dépôt :

```bash
export LISIERE_ANDROID_SDK="/chemin/vers/android-sdk"
export LISIERE_KEYSTORE="/chemin/hors-du-depot/lisiere-compact.p12"
export LISIERE_KEY_ALIAS="lisiere-compact"
read -r -s -p 'Mot de passe du keystore : ' LISIERE_KEYSTORE_PASSWORD
printf '\n'
export LISIERE_KEYSTORE_PASSWORD
bash android-wrapper/build.sh
unset LISIERE_KEYSTORE_PASSWORD LISIERE_KEY_PASSWORD
```

Le résultat est `release/Lisiere-Compact-1.3.1.apk`, version Android 1.3, code 4, identifiant `app.lisiere.reader.compact`. L’activité conserve son nom Java complet `app.lisiere.reader.MainActivity`. Le script vérifie les signatures v2/v3 et l’alignement de l’APK. Les sorties locales de reconstruction sont ignorées par Git ; elles ne remplacent pas l’APK déjà distribué dans les téléchargements du projet.

Pour mettre à jour Compact 1.2 ou 1.3 en conservant la bibliothèque, utiliser **la même clé de signature Compact**. Une nouvelle clé produit une application incompatible avec la mise à jour de l’installation existante. Aucun keystore, mot de passe ou mécanisme de création automatique de clé n’est inclus dans le dépôt.

`LISIERE_WEB_HTML` permet de choisir explicitement un autre HTML autonome. `LISIERE_BUILD_TOOLS_VERSION`, `LISIERE_PYTHON` et `JAVA_HOME` permettent de sélectionner les outils. Si la clé privée utilise un mot de passe différent du keystore, fournir aussi `LISIERE_KEY_PASSWORD`.

Les fichiers intermédiaires sont rangés dans `android-wrapper/build/run.*`, ignoré par Git. Les clés sont refusées si elles se trouvent à l’intérieur du dépôt et les mots de passe sont transmis à `apksigner` par l’environnement, sans être écrits dans un fichier ni dans les arguments de commande.

## Exporter les sources React Native/Expo

Le dépôt contient aussi les sources TypeScript récupérées de la première version, avec les réglages Compact et le pincement reportés. Leur présentation de bibliothèque précède celle de l’interface autonome distribuée ; une nouvelle exportation Expo peut donc différer visuellement de `web/index.html`.

Pour reconstruire volontairement ces sources plutôt que le snapshot distribué :

```bash
npm ci
npm run build:web
node scripts/standalone.mjs
export LISIERE_WEB_HTML="$PWD/release/Lisiere.html"
bash android-wrapper/build.sh
```

Configurer les variables de signature et de SDK décrites plus haut avant cette commande. Cette compilation nécessite aussi Node.js et les dépendances du projet.

## Installation et distribution

Installer l’APK Compact par-dessus une installation Compact existante avec le même certificat, sans désinstaller. L’ancienne application `app.lisiere.reader` est distincte ; ses livres ne sont pas importés automatiquement dans Compact.

Désinstaller l’application ou effacer ses données supprime sa bibliothèque locale. Conserver une copie des EPUB d’origine.

Les signatures et l’alignement de l’APK 1.3 distribué ont été vérifiés. Les essais tactiles ont été simulés dans un navigateur ; un essai sur un téléphone Android réel reste nécessaire.

Le script historique `fetch-sdk.py` est limité à Linux et nécessite un accès réseau autorisé. Pour les autres systèmes, installer Platform 35 et Build Tools 35.0.0 avec le gestionnaire officiel Android SDK, puis définir `LISIERE_ANDROID_SDK`.

Le fichier `THIRD_PARTY_LICENSES.txt` à la racine du projet est embarqué dans les assets de l’APK.
