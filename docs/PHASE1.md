# Phase 1 : squelette de l'application

Version 0.1 · 2026-10-11

## 1. Livré

| Élément | Détail |
|---|---|
| Recherche d'alarmes | Texte libre (accents ignorés, synonymes terrain FR → vocabulaire HMI), saisie directe `UPM 53` / `MCU 204 1001`, filtres famille / source / type / cible |
| Décodeur de codes d'erreur | Énumérations (jokers `x1`, `1xxx`, `0x001x`), champs de bits (saisie décimale ou hexadécimale, cases à cocher qui calculent le code), phases (`12` = phases 1 et 2) |
| Fiche événement | Explication française, texte du manuel (anglais), page de référence, valeurs par défaut, pièces candidates et « à vérifier d'abord » |
| Familles | 93PM / 93PS modulaire (389 ids) et 91PS / 93PS monobloc (223 ids) |
| Hors ligne | Service worker et cache des packs (voir limite §3) |
| Lien direct | `#/<famille>|<source>|<id>/<code>` ouvre une fiche avec le code déjà décodé |
| Tests | `app/tests.html` : 44 tests du décodeur et de la recherche, tous réussis |

## 2. Choix techniques

- **Modules ES natifs, sans build** : Node.js n'est pas installé sur le poste ; plutôt que d'ajouter un toolchain sans accord, le squelette fonctionne avec un simple serveur statique (`tools/serve.ps1`).
- **`decoder.js` est pur** (aucun DOM) : il se porte tel quel en TypeScript, et se testera avec n'importe quel moteur de test.
- **Packs = JSON versionnés** chargés à l'exécution : ajouter un modèle d'onduleur ne change pas le code (`CATALOGS` dans `catalog.js`).
- **Sécurité du serveur local** : n'expose que `app/` et `packs/`, jamais les outils ni les PDF.

Migration prévue vers React + TypeScript + IndexedDB quand Node sera installé : les modules `decoder` et `catalog` passent sans réécriture, seule la couche `main.js` est à remplacer.

## 3. Limites et points non vérifiés

- **Hors ligne non vérifié** : le navigateur intégré à l'outil de développement refuse l'enregistrement de tout service worker (même un service worker vide), donc le cache hors ligne n'a pas pu être testé. À vérifier sur un téléphone ou dans Chrome.
- **Pas d'icônes** dans le manifeste : l'installation « écran d'accueil » fonctionne mais sans icône dédiée.
- **Pas de persistance** : aucune donnée utilisateur (interventions, signatures, rapports) pour l'instant, c'est la suite de la phase 1.
- **Catalogue automatique** : 252 + 223 entrées sont marquées « à relire » dans l'interface.
- **Groupes d'identifiants** : une entrée de groupe (ex. surcharge phases A/B/C) affiche le même nom pour chaque numéro du groupe.
- **Accessibilité** : navigation clavier et lecteur d'écran non audités.

## 4. Suite de la phase 1

1. Parc : fiche équipement (modèle, n° de série, firmware, batterie) et import de la liste SOGB.
2. Intervention : formulaire (symptômes, alarmes relevées avec code décodé, mesures, pièces, signature), stockage local puis synchronisation.
3. Rapport PDF et protocole HSE de fin d'intervention.
4. Assistants guidés : mise en service parallèle, ajout/retrait d'une UPS (voir `parallel.json`).
5. Installer Node.js et migrer l'interface vers React + TypeScript si vous le souhaitez.
