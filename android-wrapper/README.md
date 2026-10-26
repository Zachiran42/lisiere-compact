# Enveloppe Android — Lisière Compact 1.4.0

L’activité Java charge `web/index.html` sur l’origine locale `https://appassets.androidplatform.net`. Le stockage IndexedDB conserve la bibliothèque et les réglages sur l’appareil. L’import utilise `ACTION_OPEN_DOCUMENT` avec sélection multiple et restitue toutes les URI choisies.

La permission normale `INTERNET` sert au catalogue Gutenberg. La WebView ne charge aucune ressource distante arbitraire : seul le chemin local `/gutenberg?url=…` déclenche le transport Java. Celui-ci valide l’hôte et le chemin de chaque URL HTTPS, y compris les redirections (cinq maximum), sans transmettre de cookies ni d’identifiants. Limites : 2 Mo de métadonnées, 40 Mo par EPUB, délais de connexion et de lecture, échéance globale de 45 secondes. Les liens de fiche Gutenberg s’ouvrent dans le navigateur externe. Les documents de lecture restent isolés et nettoyés par le parseur EPUB.

## Construction portable

Prérequis : Node.js (générer le HTML), Python 3.11+, JDK 17, Android SDK Platform 35 et Build Tools 35.0.0.

Depuis la racine du dépôt, définir les variables d’environnement :

- `JAVA_HOME` : dossier du JDK.
- `LISIERE_ANDROID_SDK` : racine du SDK Android.
- `LISIERE_KEYSTORE` : chemin d’un keystore existant **hors du dépôt**.
- `LISIERE_KEYSTORE_PASSWORD` : mot de passe, transmis par l’environnement à apksigner.
- `LISIERE_KEY_ALIAS` : alias, `lisiere-compact` par défaut.
- `LISIERE_KEY_PASSWORD` : facultatif si identique au mot de passe du keystore.

```sh
node scripts/build-web-features.cjs
python scripts/build-android.py
```

Pour un SDK extrait manuellement, `LISIERE_BUILD_TOOLS` et `LISIERE_PLATFORM_JAR` permettent d’indiquer les chemins exacts. Le script Bash historique reste utilisable avec `bash android-wrapper/build.sh` et les mêmes variables de signature ; il attend la disposition standard du SDK et accepte `LISIERE_WEB_HTML`.

Le résultat est `release/Lisiere-Compact-1.4.0.apk`, code 6, identifiant `app.lisiere.reader.compact`, activité `app.lisiere.reader.MainActivity`, Android minimum 24, cible 35. Les signatures v2/v3 et l’alignement sont contrôlés. Les notices MIT et tierces sont embarquées dans les assets. Les intermédiaires `android-wrapper/build/` et les APK `release/` sont ignorés par Git.

Aucun mécanisme ne crée ou publie automatiquement une clé. La même signature Compact est indispensable pour installer une mise à jour sans désinstaller. L’ancienne application `app.lisiere.reader` reste distincte.

## Vérifier le transport natif

Avec le JDK, depuis la racine :

```sh
javac -encoding UTF-8 -d android-wrapper/build/tests android-wrapper/src/app/lisiere/reader/GutenbergClient.java tests/GutenbergClientTest.java
java -cp android-wrapper/build/tests app.lisiere.reader.GutenbergClientTest
# Optionnel : requêtes réelles OPDS + EPUB avec redirection.
java -cp android-wrapper/build/tests app.lisiere.reader.GutenbergClientTest --live
```

L’APK a été compilé et vérifié, et le transport Java testé en HTTPS réel. Les essais d’interface et de sélection multiple ont été réalisés dans un navigateur ; aucun essai sur téléphone Android réel n’a été effectué pour cette livraison.
