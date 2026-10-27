# Provenance et états des sources

Le dépôt comporte deux points d'entrée complémentaires.

## Interface livrée dans Compact 1.3

`web/index.html` est le fichier autonome extrait de l'interface finale utilisée pour l'APK Compact 1.3. Il comprend la bibliothèque à tranches de livres, les barres inférieures compactes et le pincement du lecteur.

SHA-256 du fichier :

```text
be53eb10e3c836c816f73cf4c04feeacc88245eb1756138350f49c8969df9687
```

Le module de geste correspondant est également conservé sous une forme lisible dans `reader-reference/pinch-gesture.js`. Le HTML autonome contient déjà ce code.

## Sources TypeScript récupérées

`App.tsx`, `src/`, la configuration Expo et l'enveloppe Android proviennent de l'archive complète d'origine du projet. Cette archive précède la présentation de bibliothèque à tranches utilisée dans l'APK 1.3 : sa bibliothèque utilise des couvertures et une carte de reprise de lecture.

Les sources récupérées ont été remises à niveau pour intégrer le pincement et la synchronisation de la taille du texte, l'identité Compact et les barres inférieures compactes. La différence visuelle de la bibliothèque est conservée explicitement plutôt que de présenter le bundle compilé comme les sources TypeScript exactes de l'APK.

Une reconstruction de ces sources peut donc différer visuellement de `web/index.html`. Le rapport de validation de la version 1.3 décrit les contrôles réalisés sur le HTML livré et l'APK de référence ; il ne prouve pas qu'une reconstruction future produit les mêmes octets.

Les fichiers de travail locaux, journaux, bibliothèques personnelles, clés et mots de passe ne font pas partie du dépôt.

## Évolution 1.4.0

Le snapshot 1.3 est conservé sous `web/base-1.3.html` avec la somme indiquée ci-dessus. `scripts/build-web-features.cjs` vérifie cette somme, adapte les points d’import et l’entrée du catalogue, puis embarque les modules lisibles `web/features/`. Le résultat généré `web/index.html` est le HTML exact de l’APK 1.4.0. Cette voie de construction n’exige pas les dépendances Expo.

Les nouveaux modules du catalogue Gutenberg et de l’import multiple sont donc publiés en code lisible et reproductible. Ils concernent l’interface Web embarquée ; les sources Expo récupérées restent une référence antérieure distincte. L’enveloppe Java mise à jour est aussi publiée intégralement, avec le transport Gutenberg et le sélecteur multiple.


## Évolution 1.5.0

`web/features/library.js` et `library.css` contiennent la grille de couvertures et le choix de présentation. Le script de construction les intègre au même snapshot de référence. Le champ `settings.libraryView` (`covers` ou `spines`) est enregistré dans le manifeste IndexedDB existant ; aucune migration ni suppression de livres n’est nécessaire. Une préférence absente correspond à la vue couvertures. Le lecteur continue de transmettre l’ensemble des réglages lors des changements de taille ou de thème.

Les sources Expo de référence restent distinctes de cette interface Web distribuée. Le HTML autonome généré et l’enveloppe Java sont les sources de la construction APK 1.5.0.
