# Plan d'ensemble : application d'entretien des onduleurs (AFTELYA)

Mis à jour le 2026-10-11. Les détails sont dans PHASE0.md, PHASE1.md et MODULE-PARALLELE.md.

## 1. Objectif

Un technicien, sur téléphone ou tablette et même sans réseau, doit pouvoir :

1. identifier l'onduleur et voir son historique ;
2. dérouler une checklist adaptée au modèle (préventive ou curative) ;
3. être guidé dans le diagnostic (décodage des codes d'alarme) ;
4. enregistrer pièces, mesures, photos et signatures ;
5. clôturer selon le protocole HSE et produire le rapport PDF.

Le responsable SAV obtient un tableau de bord du parc et des indicateurs contractuels (disponibilité ≥ 95 %, délai d'intervention).

## 2. Principe : un cœur générique et des packs de modèle

```
CŒUR (commun)  : parc, interventions, signatures, protocole HSE, rapport PDF, stock, planning, hors ligne
PACKS (données): 93PM -> 93PS -> 9E -> 93E -> 93T -> (DX ...)
                 alarmes, pièces, checklists, mesures, procédures, parallèle, batteries
```

Ajouter un type d'onduleur = ajouter un pack, sans modifier le code.

## 3. Décisions prises

| Sujet | Décision |
|---|---|
| Parc cible | 93PM de 30 à 200 kW, unitaires et en parallèle |
| Langue des alarmes | Libellé HMI anglais, puis explication française |
| Packs suivants | 9E, 93E, 93T, 93PS |
| Technique | PWA hors ligne ; modules natifs pour l'instant, React + TypeScript visé |
| Contenu | Reformulations et références de sections, jamais le texte des manuels propriétaires ni les mots de passe constructeur |
| Alarme → pièce | Simples candidats de diagnostic, à confirmer par mesure |

## 4. État d'avancement

| Phase | Contenu | État |
|---|---|---|
| 0. Cadrage | Pack 93PM : alarmes, pièces, modes, ABM, parallèle ; pack 93PS monobloc ; chaîne d'import | **fait** |
| 1. Squelette | Recherche d'alarmes, décodeur de bits, fiche événement, tests | **fait** (hors ligne non vérifié) |
| 1 (suite) | Parc, formulaire d'intervention, rapport PDF, protocole HSE, assistants parallèles | à faire |
| 2. Diagnostic et pièces | Checklists préventives validées, arbre de diagnostic, stock | à faire |
| 3. Pilotage | Tableau de bord, KPI du contrat, planning, accès client | à faire |
| 4. Packs suivants | 9E, 93E, 93T, 93PS modulaire | à faire |

## 5. Ce qui bloque ou reste à obtenir

| # | Élément | Qui |
|---|---|---|
| 1 | Procédure de maintenance préventive 93PM officielle et manuel de maintenance batterie (documents séparés) | Vous (accès distributeur Eaton) |
| 2 | Documentation 93PM 30-40 kW (non couverte par le service manual lu) | Vous |
| 3 | Document « Isolating units from parallel system » (maintenance d'une UPS en parallèle) | Vous |
| 4 | Validation technique des candidats alarme → pièce et des 475 entrées automatiques | Technicien certifié |
| 5 | Vérification du hors ligne sur un vrai téléphone ou dans Chrome | Vous / Claude |
| 6 | Confirmation que l'accord Eaton autorise l'usage interne des références documentaires | Vous |
| 7 | Choix : installer Node.js pour passer à React + TypeScript, ou continuer en natif | Vous |

## 6. Points de vigilance

- **Sécurité** : l'app informe et guide ; elle ne remplace ni la documentation constructeur ni la procédure du site. Les consignes de consignation, EPI et vérification d'absence de tension viennent du service manual et doivent rester validées par un technicien certifié.
- **Données** : documents de 2013 à 2015, les références de pièces ont pu évoluer ; deux générations de kits 50 kVA coexistent.
- **Qualité** : toute entrée marquée `import: "auto"` est à relire.
