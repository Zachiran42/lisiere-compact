# Validation Compact 1.5.0

Vérifications réalisées dans l’interface Web réellement embarquée dans l’APK, le 27 octobre 2026.

- Bibliothèque existante restaurée avec ses livres et sa progression ; une préférence absente ouvre désormais la grille de couvertures.
- Choix Tranches puis rechargement : les tranches sont conservées. Retour à Couvertures, navigation entre les onglets et réouverture : la sélection reste mémorisée.
- Réglages → Votre bibliothèque propose deux boutons radio nommés Couvertures et Tranches.
- Couverture réelle de l’EPUB Gutenberg *Candide* chargée ; affichage `object-fit: contain`, sans recadrage. Les livres sans image utilisent la couverture illustrée existante avec titre et auteur.
- Import d’un EPUB avec une image PNG volontairement illisible : la couverture illustrée de remplacement s’affiche et le livre reste dans la bibliothèque.
- Recherche par titre dans la grille et adaptation sur ordinateur : six colonnes, sans débordement horizontal dans l’aperçu de bureau.
- Ouverture des options d’un livre depuis sa couverture, ajout aux favoris et affichage du même livre dans la grille des favoris.
- Ouverture du lecteur et changement de taille 20 → 22 px : la préférence Couvertures reste sélectionnée dans les réglages de la bibliothèque.
- Mise en page contrôlée en 390 × 844 : deux colonnes, titres et auteurs sous les couvertures, navigation basse compacte conservée.
- Le module du document de lecture et du pincement est identique à celui du snapshot de référence ; aucune modification du lecteur dans cette version.
- Construction du Java et du DEX, signatures APK v2/v3 et alignement vérifiés. Version Android 1.5.0, code 7, identifiant `app.lisiere.reader.compact`, même certificat Compact.

Les sommes SHA-256 de l’APK et de l’archive du projet sont jointes à la release. L’archive est contrôlée pour exclure les clés et données locales ; son script doit reproduire le HTML livré à l’identique.

Aucun essai sur téléphone Android physique n’a été effectué. Les fonctions de téléchargement Gutenberg et d’import multiple de la version 1.4 restent présentes ; cette version ne constitue pas une vérification juridique du catalogue de livres.
