# Phase 1 : application React + TypeScript

Version 0.2 · 2026-10-11

## 1. Livré

| Élément | Détail |
|---|---|
| Recherche d'alarmes | Texte libre (accents ignorés, synonymes terrain FR → vocabulaire HMI), saisie directe `UPM 53` / `MCU 204 1001`, filtres famille / source / type / cible |
| Décodeur de codes d'erreur | Énumérations (jokers `x1`, `1xxx`, `0x001x`), champs de bits (saisie décimale ou hexadécimale, cases à cocher qui calculent le code), phases (`12` = phases 1 et 2) |
| Fiche événement | Explication française, texte du manuel (anglais), page de référence, valeurs par défaut, pièces candidates et « à vérifier d'abord » |
| Familles | 93PM / 93PS modulaire (389 ids) et 91PS / 93PS monobloc (223 ids) |
| Lien direct | `#/<famille>\|<source>\|<id>/<code>` ouvre une fiche avec le code déjà décodé |
| PWA | Précache Workbox généré au build (voir limite §3) |
| Tests | `npm test` : 28 tests du décodeur, de la recherche et des packs réels, tous réussis |

## 2. Choix techniques

- **React 19 + TypeScript 7 + Vite 8**, tests Vitest ; Node.js 24 LTS installé le 2026-10-11 (winget `OpenJS.NodeJS.LTS`).
- **Migration sans réécriture de la logique** : `decoder.ts` et `catalog.ts` sont le portage typé des modules précédents ; les vérifications de la page de test native sont reprises en tests Vitest, plus des garde-fous sur les vrais packs (nombre d'identifiants, aucun doublon, explication française présente).
- **Packs = JSON versionnés** chargés à l'exécution depuis `packs/` : ajouter un modèle d'onduleur ne change pas le code (`CATALOGS` dans `catalog.ts`). Un plugin de `vite.config.ts` les sert en développement et les copie dans `dist/` sans les dupliquer.
- **PWA** par `vite-plugin-pwa` (Workbox, précache de 15 fichiers, environ 977 Ko).
- **Garde-fous** : `npm run check` enchaîne types, tests et validation des packs.

## 3. Limites et points non vérifiés

- **Hors ligne non vérifié** : le navigateur intégré à l'outil de développement refuse l'enregistrement de service workers. Le précache est généré au build (`dist/sw.js`) mais n'a jamais été exécuté : à tester sur un téléphone ou dans Chrome.
- **Pas d'icônes** dans le manifeste : l'installation « écran d'accueil » fonctionne mais sans icône dédiée.
- **Pas de persistance** : aucune donnée utilisateur (interventions, signatures, rapports) pour l'instant.
- **Catalogue automatique** : 252 + 223 entrées sont marquées « à relire » dans l'interface.
- **Groupes d'identifiants** : une entrée de groupe (ex. surcharge phases A/B/C) affiche le même nom pour chaque numéro du groupe.
- **Accessibilité** : navigation clavier et lecteur d'écran non audités.
- **BOM UTF-8** : les fichiers JSON écrits par PowerShell contenaient un BOM que `JSON.parse` refuse ; corrigé, et les outils écrivent désormais sans BOM.

## 4. Suite de la phase 1

1. Parc : fiche équipement (modèle, n° de série, firmware, batterie) et import de la liste SOGB.
2. Intervention : formulaire (symptômes, alarmes relevées avec code décodé, mesures, pièces, signature), stockage local (IndexedDB) puis synchronisation.
3. Rapport PDF et protocole HSE de fin d'intervention.
4. Assistants guidés : mise en service parallèle, ajout/retrait d'une UPS (voir `parallel.json`).
5. Icônes PWA et vérification du hors ligne sur un appareil réel.
