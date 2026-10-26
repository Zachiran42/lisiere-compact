# Lisière Compact

Liseuse EPUB en français avec bibliothèque locale, favoris, marque-pages et réglages de lecture. La version 1.3 ajoute le pincement à deux doigts pour modifier la taille des caractères entre 14 et 32 px, en gardant le passage lu à l'écran et en mémorisant la taille choisie.

Ce dépôt réunit les sources Expo/React Native récupérées du projet et l'interface HTML exacte de l'APK Compact 1.3. Les sources récupérées conservent une présentation de bibliothèque plus ancienne ; le lecteur et les barres compactes ont été remis à niveau. Voir [la provenance des sources](docs/SOURCE-PROVENANCE.md) pour cette distinction.

## Utiliser l'application

Pendant la lecture, écarter deux doigts pour agrandir les caractères ou les rapprocher pour les réduire. Le défilement à un doigt reste disponible, ainsi que les réglages de taille, police, interligne et ambiance.

L'APK actuel est Lisiere-Compact-1.3.1.apk : version Android 1.3.1, code 5, identifiant `app.lisiere.reader.compact`. Il peut mettre à jour Compact 1.2 avec la même signature. L'ancienne application Lisière 1.1 utilise un autre identifiant et reste distincte.

Les EPUB à texte adaptable, sans DRM, sont pris en charge. Les livres et la progression sont conservés sur l'appareil ; garder une copie des EPUB permet de les réimporter si les données de l'application sont effacées.

## Organisation

| Chemin | Contenu |
| --- | --- |
| `App.tsx`, `src/` | Sources TypeScript de l'interface, de l'import EPUB, du stockage et du lecteur |
| `src/reader/` | Document de lecture, échanges avec l'interface et pincement |
| `android-wrapper/` | Enveloppe Android WebView |
| `scripts/standalone.mjs` | Regroupement d'un export Web en HTML autonome |
| `web/index.html` | Interface autonome exacte livrée dans l'APK 1.3 |
| `reader-reference/pinch-gesture.js` | Version lisible du geste intégré à l'interface HTML 1.3 |
| `tests/` | Tests du parseur EPUB et du document de lecture |
| `docs/VALIDATION-1.3.md` | Vérifications réalisées et limites des essais |

`reader-reference/pinch-gesture.js` est un extrait destiné à la lecture et à la maintenance : il s'exécute dans le contexte du document de lecture, pas comme un script autonome à charger dans une autre page.

## Développer les sources Expo

Avec Node.js et npm installés, dans le dossier du dépôt :

```sh
npm ci
npm run web
```

Commandes de vérification :

```sh
npm run typecheck
npm test
```

Produire un export Web puis un HTML autonome :

```sh
npm run build:web
node scripts/standalone.mjs
```

Le fichier généré est `release/Lisiere.html`. Une reconstruction depuis les sources TypeScript récupérées ne reproduit pas à l'identique l'interface de bibliothèque du fichier livré `web/index.html`.

## Ouvrir l'interface HTML livrée

Pour afficher le même HTML que l'APK 1.3 avec un serveur local Python :

```sh
python -m http.server 4173 --bind 127.0.0.1 --directory web
```

Ouvrir ensuite `http://127.0.0.1:4173/`. Le stockage du navigateur et celui de l'application Android sont séparés.

## Android et signature

Le script Android utilise par défaut `web/index.html`, l'interface exacte livrée dans Compact 1.3. Il ne demande pas d'export Expo pour ce cas. La construction nécessite Bash, Python, le SDK Android et un JDK ; voir [les instructions Android](android-wrapper/README.md) pour configurer les outils et la signature puis lancer `bash android-wrapper/build.sh`.

Les clés de signature et leurs mots de passe sont conservés hors du dépôt. Pour produire une mise à jour installable sur une version existante, utiliser la même clé de signature ; une clé nouvellement créée ne peut pas remplacer cette signature.

## Validation et licences

Les gestes ont été vérifiés avec des événements tactiles synthétiques dans le navigateur, puis avec la sauvegarde et la réouverture du lecteur. Aucun essai tactile sur un téléphone Android réel n'a été effectué pour cette livraison. Les détails et la somme SHA-256 de l'APK sont dans [le rapport de validation](docs/VALIDATION-1.3.md).

Le code original de Lisière Compact est publié sous [licence MIT](LICENSE), au choix de Zachiran42. Les dépendances tierces conservent leurs licences et leurs notices ; voir [les notices de dépendances](docs/THIRD-PARTY-NOTICES.md).

## Publication et notices

La version Android **1.3.1** (code **5**) ajoute les notices complètes des bibliothèques dans l’APK ; le lecteur et l’interface restent ceux de la version 1.3. Voir [la vérification avant publication](docs/PUBLICATION.md) et les [licences tierces](THIRD_PARTY_LICENSES.txt). Le code original est désormais sous licence MIT. La licence accompagne aussi l’APK 1.3.1 comme fichier distinct dans sa publication GitHub ; le fichier APK signé reste inchangé.
