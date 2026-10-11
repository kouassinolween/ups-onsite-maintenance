# UPS onsite maintenance : application d'entretien et de diagnostic des onduleurs Eaton

Aide au diagnostic pour les techniciens AFTELYA : catalogues d'événements, décodage des codes d'erreur,
documentation structurée par modèle (« packs »). État : **phase 1, squelette**.

## Lancer l'application

```powershell
powershell -File tools\serve.ps1 -Port 8765
```

puis ouvrir <http://localhost:8765/app/>. Aucun outil à installer (modules ES natifs, pas de build).
Tests du décodeur : <http://localhost:8765/app/tests.html> (44 tests, affichés dans la page).

## Contenu

| Dossier | Rôle |
|---|---|
| `app/` | Application web (PWA) : recherche, détail, décodeur de codes |
| `app/js/decoder.js` | Décodage pur (énumérations avec jokers, champs de bits, phases) |
| `app/js/catalog.js` | Chargement des packs, recherche (synonymes FR→EN, accents ignorés) |
| `packs/93pm/` | Pack Eaton 93PM : alarmes, pièces, modes, ABM, parallèle, checklist (brouillon) |
| `packs/93ps/` | Pack 91PS/93PS : catalogue monobloc, hérite du catalogue modulaire du 93PM |
| `tools/` | Import du manuel d'alarmes, fusion, validation, serveur local |
| `docs/` | Cadrage (PHASE0), module parallèle, phase 1 |

## Chaîne de données

```
PDF Eaton --pdftotext--> texte --import-alarms.ps1--> brut --merge-alarms.ps1--> packs/*/alarms*.json
                                                           (+ fr-dictionary.json, + entrées relues)
packs --validate-pack.ps1--> contrôle --> app (fetch ../packs/...)
```

Commandes :

```powershell
pdftotext -layout Alarms_Manual_For_Eaton_Rev03.pdf alarms.txt
powershell -File tools\import-alarms.ps1 -Text alarms.txt -Out alarms.raw.json
powershell -File tools\merge-alarms.ps1 -RawPath alarms.raw.json
powershell -File tools\validate-pack.ps1 -Pack packs\93pm
```

## Règles de contenu

- Les packs contiennent des **reformulations et des références de sections**, pas le texte des manuels propriétaires.
- Aucun mot de passe constructeur n'est stocké.
- Toute entrée `import: "auto"` est à relire ; tout candidat alarme → pièce est à confirmer par mesure.
- L'application est une aide : elle ne remplace ni la documentation constructeur ni les procédures de sécurité du site.
