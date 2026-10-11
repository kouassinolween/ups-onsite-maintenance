# UPS onsite maintenance : application d'entretien et de diagnostic des onduleurs Eaton

Aide au diagnostic pour les techniciens AFTELYA : catalogues d'événements, décodage des codes d'erreur,
documentation structurée par modèle (« packs »). État : **phase 1, interface React + TypeScript**.

## Démarrer

Prérequis : Node.js 24 LTS.

```powershell
npm install        # une seule fois
npm run dev        # http://localhost:5173
npm run check      # types + tests + validation des packs
npm run build      # production : dist/ (PWA, packs inclus)
```

## Organisation

| Dossier | Rôle |
|---|---|
| `src/lib/decoder.ts` | Décodage pur : énumérations avec jokers, champs de bits, phases |
| `src/lib/catalog.ts` | Chargement des packs, recherche (synonymes FR → EN, accents ignorés) |
| `src/components/` | Écrans : recherche, détail, décodeur de code |
| `packs/93pm/` | Pack Eaton 93PM : alarmes, pièces, modes, ABM, parallèle, checklist (brouillon) |
| `packs/93ps/` | Pack 91PS/93PS : catalogue monobloc, hérite du catalogue modulaire du 93PM |
| `tools/` | Import du manuel d'alarmes, fusion, validation des packs (PowerShell) |
| `docs/` | Plan, phases 0 et 1, module parallèle |

Les packs restent à la racine (`packs/`) : `vite.config.ts` les sert sous `/packs/` en développement
et les copie dans `dist/` au build, sans duplication.

## Chaîne de données

```
PDF Eaton --pdftotext--> texte --import-alarms.ps1--> brut --merge-alarms.ps1--> packs/*/alarms*.json
                                                           (+ fr-dictionary.json, + entrées relues)
packs --validate-pack.ps1--> contrôle --> app (fetch /packs/...)
```

```powershell
pdftotext -layout Alarms_Manual_For_Eaton_Rev03.pdf alarms.txt
powershell -File tools\import-alarms.ps1 -Text alarms.txt -Out alarms.raw.json
powershell -File tools\merge-alarms.ps1 -RawPath alarms.raw.json
npm run packs:validate
```

## Règles de contenu

- Les packs contiennent des **reformulations et des références de sections**, pas le texte des manuels propriétaires.
- Aucun mot de passe constructeur n'est stocké.
- Toute entrée `import: "auto"` est à relire ; tout candidat alarme → pièce est à confirmer par mesure.
- L'application est une aide : elle ne remplace ni la documentation constructeur ni les procédures de sécurité du site.
