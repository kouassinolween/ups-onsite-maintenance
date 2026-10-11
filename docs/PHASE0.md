# Phase 0 : cadrage et premier pack 93PM

Version 0.3 · 2026-10-11 · Statut : livrable de cadrage, à valider avant la phase 1.

## 1. Décisions de l'équipe (réponses du 2026-10-11)

| Sujet | Décision |
|---|---|
| Parc | 93PM de 30 à 200 kW, en unitaire et en parallèle |
| Langue des alarmes | Libellé HMI anglais d'abord, puis explication en français (`name` + `desc_fr`) |
| Packs suivants | 9E, 93E, 93T, 93PS |
| Outil PDF | poppler installé (winget `oschwartz10612.Poppler` 25.07.0), `pdftotext` disponible |
| Indices alarme → pièce | À corriger : refaits en v0.2 à partir du service manual (voir §4) |

## 2. Livrables

| Fichier | Contenu | État |
|---|---|---|
| `packs/93pm/pack.json` | Identité, architecture UPM/MCU/CSB, périmètre du service manual, feuille de route des packs | v0.2 |
| `packs/93pm/alarms.json` | 389 identifiants modulaires (UPM 124, MCU 163, CSB 102) : 108 entrées relues à la main (137 ids) + 252 extraites automatiquement ; codes d'erreur décodables, textes anglais et français | complet, à relire |
| `packs/93ps/alarms.monoblock.json` | 223 identifiants monobloc 91PS/93PS 8-10 kVA (UPM 135, CSB 88) | extraction auto, à relire |
| `packs/93pm/modes.json` | Modes d'exploitation, bypass, site wiring fault, ventilateurs | brouillon |
| `packs/93pm/abm.json` | Cycle ABM, états, diagnostics batterie | brouillon |
| `packs/93pm/parallel.json` | Parallèle interne/externe, câblage, mise en service, synchronisation, surcharge, mode service | brouillon |
| `tools/import-alarms.ps1` / `merge-alarms.ps1` / `fr-dictionary.json` | Chaîne d'import reproductible du manuel d'alarmes | fonctionnel |
| `packs/93pm/parts.json` | 31 références, 12 kits Rev05 + 3 kits 2013, candidats de diagnostic | v0.2 |
| `packs/93pm/checklists.draft.json` | Préparation §8.2, mesures, contrôles, remise en service §8.3, clôture | brouillon non validé |
| `tools/validate-pack.ps1` | Contrôle automatique d'un pack | fonctionnel |

Validation : `powershell -File tools\validate-pack.ps1 -Pack packs\93pm` → OK.

## 3. Ce que la lecture du service manual (P-164000219 Rev B02) a changé

1. **Périmètre** : le manuel couvre le 93PM **50-200 kW**. Les 30-40 kW ne sont pas couverts ; le 400 V a des chapitres plus courts (7 et 9) que le 480 V (6 et 8). Pour un parc 30-200 kW, il manque donc au moins la documentation 30-40 kW.
2. **La maintenance préventive officielle est un document séparé** (SM §11.2, site de support technique Eaton) et la maintenance batterie a son propre manuel. Ils ne sont pas dans le dossier : la checklist actuelle n'est qu'un squelette.
3. **Séquence de préparation à la maintenance** (SM §8.2) intégrée à la checklist : sécuriser ou transférer la charge, consigner, ouvrir les batteries, vérifier l'absence de tension et d'énergie stockée au multimètre, attention au neutre sous tension sur bypass de maintenance.
4. **Comportement des ventilateurs** (SM §4.3.19.1) : un défaut ventilateur UPM est une alarme seule ; un défaut ventilateur MCU/STS inhibe l'ESS et expose l'interrupteur statique à un risque de dommage.
5. **Deux générations de kits 50 kVA** : le fichier 2013 et la Rev05 de 2014 partagent les numéros HPO-1040580/581/582 avec des références de pièces différentes. Les deux sont conservées séparément (`kits_legacy_2013`).
6. **Mots de passe par défaut** : le manuel en contient pour les niveaux d'accès HMI. L'application ne les stocke jamais.
7. **Confidentialité** : le manuel est propriétaire (reproduction interdite hors accord écrit). Le projet n'en recopie pas le texte : uniquement des références de sections (`SM §…`) et des reformulations.

## 4. Indices alarme → pièce (corrigés)

Aucun document lu ne contient de table « alarme → pièce ». Les indices v0.2 sont des **candidats de diagnostic**, chacun avec : pièces candidates, procédure de remplacement (section du service manual), comportement de l'UPS, et « à vérifier d'abord ». Ils suivent la méthode du manuel (processus en six étapes, SM §11.3.1) : l'alarme oriente, la mesure décide.

| Événement | Candidat | Procédure | À vérifier d'abord |
|---|---|---|---|
| UPM 48 Fan Failed | 118-20292 | SM §8.4.2 / 8.4.10 / 8.4.11 / 8.4.12 | quel ventilateur, puis alimentation avant le ventilateur |
| UPM 123 Fan Speed Error | 118-20292 | SM §8.4.2 / 8.4.10 | n° de ventilateur (code 1 à 3) |
| MCU 288 STS Fan Failed | aucun confirmé | SM §8.4.9 | applicabilité de 118-20292 aux ventilateurs STS : non établie |
| UPM 7 Inverter Fault | 744-A2555-00P | SM §8.4.3 / 8.4.5 / 8.4.6 | journal service, cartes IO et interface |
| UPM 104 Rectifier Fault | 744-A1921-00P | SM §8.4.3 / 8.4.6 | idem côté redresseur |
| UPM 10 / 11 DC Link | 744-09172-00P | SM §8.4.4 | code 1/2 (immédiat) ou 4/5 (500 ms) |
| MCU 224 Static Switch Short | 090-01079-0X (100 kW), 090-01217 (150/200 kW) | SM §8.4.9 / 8.4.13 | fusibles STSW |
| UPM 70 Battery Switchgear Failed | P-128000007 | SM §8.4.13 / 3.8.4 | la détection de fusible HS n'existe pas (UPM 47) : mesurer |
| CSB 414 Internal Comms Failure | 744-A2847-00P | SM §8.4.8 / 3.2 | câblage CAN, quel UPM/MCU |
| HMI | 744-A2678-00P | SM §8.4.14 | calibration tactile SM §10.3 |

À faire valider par un technicien certifié avant tout usage sur site.

## 5. Écarts et points douteux relevés dans les sources

- UPM 1 *Inverter AC Over Voltage* : le texte du manuel décrit une sous-tension (copier-coller probable).
- Annexe A du manuel d'alarmes : doublons d'ID (« Enable ESS » et « Disable ESS » portent tous deux 444 ; « Summary Notice » 469 duplique « Disable Boost Charging »). Se baser sur les sections 2.1-2.3.
- `93PMfirmwarehistory_(1.14_=_Latest).pdf` alors que le dossier contient jusqu'à 1.38.
- Kits de pièces : documents de 2013-2014, les références ont pu évoluer.
- Numérotation CSB : avant le firmware 1.24, les événements CSB commençaient à 320.

## 6. Reste à faire pour clore la phase 0

| # | Action | Responsable |
|---|---|---|
| 1 | Obtenir la procédure de maintenance préventive 93PM et le manuel de maintenance batterie (documents séparés) | **Vous** (accès distributeur Eaton) |
| 2 | Documentation 93PM 30-40 kW (non couverte par le service manual lu) | **Vous** |
| 3 | Valider ou corriger les candidats du §4 | **Technicien certifié** |
| 4 | Compléter `alarms.json` : statuts et commandes restants (~200 identifiants) | Claude, script + relecture |
| 5 | Lire les chapitres 3, 4 (modes, ABM, parallèle) et 6.3 (parallèle externe) pour le module parallèle | Claude |
| 6 | Extraire le catalogue d'alarmes 93PS du manuel d'alarmes (section 3) pour le pack suivant | Claude |
| 7 | Confirmer le cadre d'usage : le service manual est propriétaire, vérifier que l'accord avec Eaton autorise une référence dans un outil interne | **Vous** |

## 7. Avant la phase 1

- Poser le squelette du projet (PWA React + TypeScript, chargeur de pack, recherche d'alarme avec décodage de bits).
- Définir le JSON Schema formel à partir des trois fichiers de données.
- Traduction en français des alarmes les plus fréquentes (champ `desc_fr` déjà renseigné pour les 137 identifiants, à relire).

