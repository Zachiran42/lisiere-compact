# Vérifications de la version 1.3

Ces vérifications concernent l'interface Web intégrée à Lisière Compact 1.3 et l'APK signé qui l'accompagne.

## Gestes de lecture

Un banc d'essai utilisant les écouteurs tactiles du document de lecture a exécuté 13 contrôles avec des événements tactiles synthétiques :

- état initial à 20 px ;
- geste à un doigt sans changement de taille ;
- écartement progressif donnant 26 px ;
- un seul enregistrement à la fin d'un geste composé de plusieurs mouvements ;
- conservation de l'ancre de texte sous les doigts ;
- rapprochement donnant 16 px ;
- limites de 14 et 32 px ;
- conservation de la taille finale après annulation du geste ;
- enregistrement d'un geste interrompu quand la page est masquée ;
- synchronisation de la taille depuis les réglages ;
- rejet d'une valeur de taille invalide.

Les 13 contrôles sont passés. Dans le contrôle d'ancrage, le déplacement mesuré de la ligne était inférieur à 0,1 pixel.

## Application complète

- Le geste a fait passer la taille de 20 à 26 px.
- Le document de lecture n'a été chargé qu'une seule fois pendant le changement de taille.
- Le bouton d'agrandissement a ensuite fait passer la taille de 26 à 28 px.
- La taille de 28 px a été conservée après fermeture et réouverture du lecteur.

## Barres inférieures

La bibliothèque utilise une barre de 33 pixels CSS et le lecteur un pied de 35 pixels CSS. Leur position et l'absence de débordement horizontal ont été contrôlées aux formats 360 × 800, 390 × 844, 800 × 1280 et 740 × 360.

## APK Android

- Identifiant : `app.lisiere.reader.compact`.
- Version : `1.3`, code `4`.
- Signatures APK v2 et v3 vérifiées.
- Alignement ZIP sur 4 octets vérifié.
- Même certificat que Lisière Compact 1.2, pour permettre sa mise à jour.
- DEX et ressources Android inchangés par rapport à Compact 1.2.

SHA-256 de l'APK 1.3 :

```text
5e4655d560e85c10989bb5d6e65ab798e9f42e29c7d506f4420b2be145d6b2cc
```

Les gestes ont été validés par simulation dans le navigateur. Aucun essai tactile sur un téléphone Android réel n'a été effectué lors de cette livraison.

## Contrôles des sources récupérées lors de la mise en dépôt

Quatre tests du document de lecture passent avec le compilateur TypeScript intégré à Node.js : échappement du titre et des ancres, messages invalides, restauration de la position et validation des tailles de police. Les ressources Android, le Java, le DEX, l'assemblage et l'alignement ont également été construits avec les outils locaux.

L'installation complète des dépendances Expo a rencontré une restriction d'écriture dans des sous-dossiers `node_modules` sur ce PC. Le contrôle de types de l'ensemble de l'application et la suite Expo complète n'ont donc pas été exécutés pour ces sources récupérées. Le script Bash complet n'a pas été exécuté dans cet environnement Windows.
