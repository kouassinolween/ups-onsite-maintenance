# Module parallèle (et batteries ABM) : conception

Version 0.1 · 2026-10-11 · Base : service manual P-164000219 Rev B02 (50-200 kW) et manuel d'alarmes P-164000681 rev 003.
Données : `packs/93pm/parallel.json`, `packs/93pm/abm.json`, `packs/93pm/modes.json`.

## 1. Pourquoi un module dédié

Une UPS en parallèle n'est pas un équipement isolé : une alarme peut venir d'une autre UPS, du câblage entre unités (CAN, pull chain) ou d'un paramètre partagé. L'app doit donc raisonner au niveau du **système** et pas seulement de l'équipement.

## 2. Modèle de données

```
site
 └─ systeme_parallele (id, topologie, nb_ups, redondance, date_mise_en_service)
     ├─ ups[1..8]  (numero_ups 1-8 unique, n_serie, puissance, nb_UPM, version firmware)
     │    ├─ upm[1..4]  (n_serie module, état, date remplacement ventilateurs/condensateurs)
     │    ├─ mob  (état, entrée bâtiment, polarité NO/NF)
     │    └─ batterie[] (configuration, éléments, strings, date installation, mode commun/séparé)
     └─ liaisons (chaîne CAN externe : ordre des UPS, terminaisons 120 Ω, pull chain)
```

Règles que l'app peut contrôler sans accès à l'onduleur (saisie du technicien) :

| Règle | Source |
|---|---|
| 1 à 8 UPS, numéros uniques de 1 à 8 | SM §6.3.1 |
| Jusqu'à 4 UPM par UPS ; N+0 à N+3 en parallèle interne | SM §2.6.1 |
| Puissances mixtes tolérées si les interrupteurs statiques (STS) sont identiques | SM §2.6.2 |
| Terminaison 120 Ω uniquement à la première et à la dernière UPS de la chaîne CAN | SM §6.3.2 |
| MOB : un contact vers la pull chain (bornes 1-2) et un contact vers une entrée bâtiment | SM §6.3.2 |

## 3. Écrans prévus

1. **Fiche système parallèle** : schéma des UPS, numéros, chaîne CAN, état de chaque MOB.
2. **Assistant de mise en service** : les 6 étapes de câblage/programmation et les 5 vérifications (`commissioning_procedure`), avec saisie des résultats et photos.
3. **Diagnostic parallèle** : points d'entrée par symptôme (`diagnosis_entry_points`), alarmes liées avec décodage de bits.
4. **Mode maintenance d'une UPS** : rappels MOB ouvert, mode service UPM, ordre de réintégration (voir §5).
5. **Batteries et ABM** : état ABM courant, résultat des tests, alertes Service Battery / Battery Test Failed.

## 4. Diagnostic : principes retenus

- Une alarme `MCU:265 External CAN Abnormal` se lit en bits (UPS qui ne communiquent plus, nombre d'UPS < réglage, pas de paquets émis/reçus, CAN en error passive).
- `Check Pull Chain` (UPM:82 / MCU:235) est testé par la procédure de vérification : MOB ouverts, commande bypass, absence d'alarme, arrêt en cascade.
- `MCU:316 Parameter Match Failed` donne l'adresse du premier paramètre partagé en écart : l'app doit afficher l'EEP concerné et l'invite à corriger puis réinitialiser, sans corriger automatiquement les autres.
- Les configurations dupliquées se voient dans `UPM:53 bit 0x08` et `MCU:239 bit 0x80`.

## 5. Sécurité : points à ne pas banaliser (à relire par le technicien certifié)

- Avant de relier des UPS en parallèle, chaque unité doit avoir terminé son démarrage individuel, sans alarme, et être commandée hors ligne.
- MOB ouvert : l'UPS ignore les données externes et les autres ignorent la sienne. Ne pas fermer le MOB si l'UPS en maintenance a de la tension en sortie ; elle ne peut pas se synchroniser avec le MOB ouvert.
- Mode service UPM : refusé si l'UPM alimente la charge ; il est mémorisé et persiste après coupure de l'alimentation auxiliaire.
- En arrêt, des tensions dangereuses subsistent (entrées, bus DC, chargeur) : ouvrir le disjoncteur batterie avant de retirer un panneau de protection.

## 6. Limites connues

- Les sources couvrent le 93PM 50-200 kW. L'applicabilité aux 30-40 kW et aux versions 400 V (chapitre 9, plus court) est à confirmer ; les figures de câblage ne sont pas analysées.
- La procédure d'harnais parallèle, le coordinateur de parallèle et les schémas de test du dossier « Parallel Systems 93PM » (PDF de 38 à 230 Ko) n'ont pas été lus.
- Les états machine détaillés (SM tableau 4.8) et les séquences de transfert complètes ne sont pas repris : le pack décrit les modes d'exploitation et les événements.
- Valeurs d'exemple (ABM, surcharge) : rappelées pour comprendre les mécanismes, pas pour régler un site.

## 7. Prochaine étape

Lire « Parallel Systems 93PM » (adding/removing units, harnais) pour compléter la procédure d'ajout et de retrait d'une UPS d'un système parallèle, puis construire l'assistant de mise en service au sein de la phase 1.
