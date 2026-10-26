# Validation Compact 1.4.0

## Résultats

- 7 tests Node réussis : import partiel après erreur, traitement séquentiel, doublons dans un lot et dans une bibliothèque existante sans perte de progression, limites des fichiers, filtre de langue OPDS, restriction des URL, plafonds des flux, erreurs HTTP et annulation.
- 6 vérifications OPDS dans le DOM du navigateur réussies : métadonnées échappées, pagination, choix EPUB 3, rejet XML malformé, DOCTYPE et liens externes.
- Transport Java réel : catalogue du livre Gutenberg 4650 puis EPUB 3 avec redirection, fichier ZIP reçu de 195 063 octets. Les URL arbitraires, authentifiées, HTTP, ports alternatifs et chemins encodés sont refusés.
- Interface réelle à 390 × 844 : téléchargement de *Candide, ou l’optimisme*, ajout à la bibliothèque, ouverture du livre et affichage du texte. Les mentions et licences Gutenberg du fichier restent lisibles.
- Sélecteur de fichiers du navigateur confirmé multiple. Lot réel de 4 fichiers : 2 EPUB valides ajoutés, 1 copie ignorée, 1 EPUB corrompu signalé. Les deux succès restent présents après rechargement de l’application.
- Construction du HTML depuis la référence 1.3 et les modules lisibles. Construction du Java, DEX, ressources et APK, contrôle des signatures v2/v3 et de l’alignement.
- Identifiant `app.lisiere.reader.compact`, version 1.4.0, code 6, min SDK 24, cible 35, permission INTERNET. Même certificat Compact que 1.3.1 : SHA-256 `3b15772c3206b084eb589a4d4a867140b12b74d1a0dde0819f031295a9832b99`.

## Limites

Aucun téléphone Android physique ni émulateur n’a été utilisé. Le sélecteur Android a été compilé et vérifié dans le code, mais son comportement dépend aussi du fournisseur de documents et de la WebView du téléphone. Installer par-dessus l’ancienne version Compact, puis vérifier la sélection longue de plusieurs fichiers dans le sélecteur Android.

Le catalogue dépend de la disponibilité du Projet Gutenberg et de ses flux OPDS XML. Le logiciel n’établit pas le statut juridique de chaque livre dans chaque pays. Le HTML de référence et les modules sont la voie de reconstruction de l’interface distribuée ; les sources Expo antérieures ne produisent pas ce même résultat.

Les sommes SHA-256 de la livraison sont fournies séparément avec les fichiers de release.
