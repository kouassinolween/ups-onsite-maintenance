# Fusionne l'extraction brute du manuel d'alarmes avec le catalogue relu à la main.
#  - packs/93pm/alarms.json            : catalogue modulaire (93PM, et 91PS/93PS modulaires)
#  - packs/93ps/alarms.monoblock.json  : catalogue monobloc 91PS/93PS 8-10 kVA
# Les entrées déjà relues (import = "curated") ne sont jamais écrasées.
param(
    [Parameter(Mandatory=$true)][string]$RawPath,
    [string]$Root = ''
)
$ErrorActionPreference = 'Stop'
if (-not $Root) { $Root = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent }
$rows = Get-Content $RawPath -Raw -Encoding UTF8 | ConvertFrom-Json
$modPath = Join-Path $Root 'packs\93pm\alarms.json'
$cur = Get-Content $modPath -Raw -Encoding UTF8 | ConvertFrom-Json

function Norm([string]$s) { return ($s.ToLower() -replace '[^a-z0-9]','') }

# --- correctifs ponctuels là où le tableau du PDF est ambigu --------------------------
$overrides = @{
    'modular|UPM|90'   = @{ kind='status'; level=1; target='user'; note="Type vide dans le manuel (statut ABM, niveau 1 déduit des statuts ABM voisins 88-89)." }
    'monoblock|UPM|48' = @{ kind='alarm';  level=10; target='user'; note="Libellé 'All Level 10 User' dans le manuel, lu comme alarme niveau 10 utilisateur." }
    'monoblock|UPM|59' = @{ kind='status'; level=$null; target='service'; note="Type et niveau absents dans le manuel (statut 'installed')." }
    'monoblock|CSB|222'= @{ kind='alarm';  level=14; target='service'; note="Type tronqué dans l'extraction : 'Alarm Level 14 Service'." }
}

# --- index des descriptions françaises déjà relues, par nom normalisé -----------------
$frByName = @{}
foreach ($e in $cur.events) { if ($e.desc_fr) { $frByName[(Norm $e.name)] = $e.desc_fr } }

# --- dictionnaire de traduction pour les statuts/événements récurrents ----------------
$dict = @{
 'upmcontrolpoweron'='Statut journalisé à la fin de l''initialisation du module.'
 'inverteron'='Journalisé au démarrage ou à l''arrêt de l''onduleur.'
 'inverteronoff'='Journalisé au démarrage ou à l''arrêt de l''onduleur.'
 'chargeron'='Journalisé au démarrage ou à l''arrêt du chargeur.'
 'chargeronoff'='Journalisé au démarrage ou à l''arrêt du chargeur.'
 'rectifieronoff'='Journalisé à la mise en marche ou à l''arrêt du redresseur.'
 'upmhot'='Indique à la CSB si la sortie onduleur de l''UPM est sous tension ; n''agit que sur l''affichage.'
 'outputhot'='Indique à la CSB si la sortie est sous tension ; n''agit que sur l''affichage.'
 'bypasshot'='Indique à la CSB si l''entrée bypass est sous tension ; n''agit que sur l''affichage.'
 'batteryincommon'='Valable en parallèle (2 UPM ou plus) : vrai si les UPM partagent une batterie commune.'
 'batteryinstalled'='Indique si la batterie est installée.'
 'bypassinstalled'='Indique si le bypass est installé.'
 'mbsinstalled'='Indique si le bypass de maintenance (MBS) est installé.'
 'misinstalled'='Indique si un MIS est installé (toujours faux).'
 'misopenclosed'='Indique si le MIS/contacteur onduleur est ouvert ou fermé.'
 'mobopen'='Le disjoncteur de sortie du module (MOB) est ouvert.'
 'essinstalled'='Le mode ESS est installé et peut être commandé.'
 'essenabled'='Le mode ESS est activé (commande donnée depuis l''afficheur).'
 'essenable'='Le mode ESS est activé.'
 'essactive'='L''UPS est en mode ESS (nécessite ESS installé et activé).'
 'essmodeon'='Le mode ESS est actif.'
 'vmmsinstalled'='VMMS installé.'
 'vmmsenabled'='VMMS activé : le système y transfère quand les conditions le permettent.'
 'vmmsenable'='VMMS activé.'
 'vmmsactive'='L''UPS est en mode VMMS.'
 'abminstalled'='ABM (gestion avancée de batterie) installé.'
 'abmenable'='ABM activé et activable.'
 'abmenabled'='ABM activé et activable.'
 'abmactive'='ABM actif.'
 'abmstatecharging'='Mode ABM : charge.'
 'abmstatefloating'='Mode ABM : floating (maintien).'
 'abmstateresting'='Mode ABM : repos.'
 'abmstatereset'='ABM réinitialisé (ou désactivé par réglage utilisateur).'
 'hrsinstalled'='L''unité supporte le mode HRS.'
 'hrsenable'='HRS activé et activable.'
 'hrsenabled'='HRS activé et activable.'
 'hrsactive'='HRS actif.'
 'upsonbattery'='La charge est alimentée par la batterie.'
 'upsonbypass'='La charge est alimentée par le bypass.'
 'upssystemonline'='L''UPS est en mode online (double conversion).'
 'upsshutdown'='La MCU est à l''état arrêt.'
 'upssystemoff'='UPS arrêté, système parallèle distribué arrêté.'
 'upsstarting'='L''UPS démarre (passage à l''état online).'
 'upsready'='L''UPS est à l''état prêt.'
 'upsongenerator'='L''UPS fonctionne sur groupe électrogène (entrée de signal configurée "On generator").'
 'upssystemnormal'='L''UPS est passé en mode normal.'
 'loadpoweroff'='La charge a été coupée de façon anormale (pas sur commande, EPO ou batterie basse).'
 'batterytestinprogress'='Un test batterie (rapide ou complet) est en cours.'
 'batterydischarging'='La batterie se décharge ; n''agit que sur l''affichage.'
 'upmonnormal'='L''UPM est en ligne (online).'
 'upmonbattery'='La charge est alimentée par la batterie depuis plus de 5 s.'
 'singleupssystem'='Système à un seul UPM.'
 'internalredundantsystem'='Système redondant interne (plusieurs UPM dans une UPS).'
 'distributedparallelsystem'='Système parallèle distribué.'
 'staticswitchactive'='L''interrupteur statique est actif : UPS sur bypass ou en ESS.'
 'staticswitchon'='L''interrupteur statique est activé.'
 'onbatteryledislit'='LED jaune batterie allumée : charge sur batterie.'
 'onbypassledislit'='LED jaune bypass allumée : UPS sur bypass.'
 'onlineledislit'='LED verte online allumée : charge protégée.'
 'onalarmledislit'='LED rouge d''alarme allumée : au moins une alarme active.'
 'onnoticeledislit'='LED notice allumée : au moins un avis actif.'
 'hornisbuzzing'='L''alarme sonore retentit : au moins une alarme active.'
 'upsnotredundant'='Utilisé par la CSB pour l''affichage des commandes d''arrêt UPS ; sans effet fonctionnel.'
 'upmsnotredundant'='Utilisé par la CSB pour l''affichage des commandes d''arrêt UPM ; sans effet fonctionnel.'
 'systemonbypass'='Utilisé par la CSB pour l''affichage des commandes online ; sans effet fonctionnel.'
 'systemnotredundant'='Système parallèle configuré en redondance fonctionnant en mode capacité.'
 'resethistorylog'='Le journal historique a été effacé.'
 'clearalarms'='Les alarmes actives ont été effacées (bit 0x01 : alarmes sticky ; 0x02 : statuts).'
 'clearcallservice'='L''appel service a été effacé.'
 'clearwarrantyreminder'='Le rappel de garantie a été effacé.'
 'clocksetdone'='L''horloge temps réel a été réglée.'
 'csbcontrolpower'='Journalisé après l''initialisation du processeur de la CSB (code ≠ 0 : reset dû au firmware).'
 'mcucontrolpower'='Journalisé après l''initialisation du processeur MCU (code ≠ 0 : reset dû au firmware).'
 'upmcontrolpower'='Journalisé après l''initialisation du processeur UPM (0 = mise sous tension normale ; 3, 5, 8 = reset anormal).'
 'registrationreminder'='Rappel d''enregistrement de l''unité, environ 30 jours après la mise en service.'
 'limitedhistorylog'='Journal historique limité.'
 'batterytestaborted'='La commande de test batterie n''a pas pu aboutir.'
 'highalert'='Alerte haute ESS active (détection d''orage).'
 'frequencyautodetected'='La fréquence nominale (50 ou 60 Hz) a été détectée automatiquement.'
 'bypassservicebuttonon'='Bouton de service forçant le transfert sur bypass (commande HMI désactivée).'
 'bypassbreakerinstalled'='Disjoncteur bypass installé (réservé, non implémenté).'
 'bypassbreakeractive'='Disjoncteur bypass actif (réservé, non implémenté).'
 'userloginsuccessful'='Connexion utilisateur réussie (niveau 1, 2 ou 3).'
 'transformerfanfailed'='Défaut ventilateur transformateur (9PHD uniquement, désactivé par défaut).'
 'transformerovertemperaturetrip'='Surtempérature transformateur : arrêt de l''UPS (9PHD uniquement, désactivé par défaut).'
 'summarynotice'='Avis de synthèse des UPS marines 9PHD.'
 'bmscommunicationfailed'='Perte de communication avec le BMS de batterie lithium externe (réservé 93PR).'
 'ul924shorttestcommand'='Commande de test UL924 court.'
 'ul924longtestcommand'='Commande de test UL924 long.'
}

$frDict = @{}
$dictFile = Join-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) 'fr-dictionary.json'
if (Test-Path $dictFile) { (Get-Content $dictFile -Raw -Encoding UTF8 | ConvertFrom-Json).PSObject.Properties | Where-Object { -not $_.Name.StartsWith('_') -and $_.Value } | ForEach-Object { $frDict[$_.Name] = $_.Value } }

function Parse-ErrorCode([string]$desc) {
    $pairs = [ordered]@{}
    foreach ($ln in ($desc -split "`n")) {
        $t = $ln.Trim() -replace '^[••â€¢]+\s*',''
        if ($t -match '^(0x[0-9A-Fa-f]+|\d+|x\d|\d{3,5}xx|[1-3]xxx)\s*[:=]\s*(.+)$') { $pairs[$Matches[1]] = $Matches[2].Trim() }
    }
    if ($desc -match '(?i)no error code' -and $pairs.Count -eq 0) { return @{ type = 'none' } }
    if ($pairs.Count -eq 0) { return @{ type = 'none' } }
    $hex = @($pairs.Keys | Where-Object { $_ -like '0x*' }).Count
    $isBits = ($hex -ge 2) -or ($desc -match '(?i)bit\s?field')
    if ($isBits -and $hex -ge 1) { return @{ type = 'bitfield'; bits = $pairs } }
    if ($desc -match '(?i)phase' -and ($pairs.Keys -contains '12' -or $pairs.Keys -contains '123')) { return @{ type = 'phases'; values = $pairs } }
    return @{ type = 'enum'; values = $pairs }
}

function Make-Fr($r, $ec) {
    $key = Norm $r.name
    if ($frByName.ContainsKey($key)) { return @{ text = $frByName[$key]; how = 'reused' } }
    $famKey = "$($r.family)|$key"
    if ($frDict.ContainsKey($famKey)) { return @{ text = $frDict[$famKey]; how = 'dictionary' } }
    if ($frDict.ContainsKey($key)) { return @{ text = $frDict[$key]; how = 'dictionary' } }
    if ($dict.ContainsKey($key) -and $dict[$key]) { return @{ text = $dict[$key]; how = 'dictionary' } }
    if ($r.name -match '^Signal Input\s*(\d) On$') {
        return @{ text = "L'entrée de signal $($Matches[1]) est active mais n'est associée à aucune action : simple avis générique."; how = 'template' }
    }
    if ($r.name -match '^Signal Input' -and $r.desc_en -match '[“"]([^”"]+)[”"]') {
        return @{ text = "Une entrée de signal (building input) est active et configurée en « $($Matches[1]) ». Le code d'erreur indique quelles entrées (bit 0x0001 = entrée 1 ... 0x0100 = entrée 9)."; how = 'template' }
    }
    if ($r.kind -eq 'command' -and $r.desc_en -match 'Source of the command') {
        return @{ text = "Commande « $($r.name) » émise depuis la CSB. Source : 1 = afficheur, 2 = commande distante."; how = 'template' }
    }
    if ($r.kind -eq 'command') {
        return @{ text = "Commande « $($r.name) » reçue."; how = 'template' }
    }
    return $null
}

$stats = @{ modular_new = 0; mono = 0; fr_ok = 0; fr_todo = 0 }
$todo = New-Object System.Collections.Generic.List[string]

function Make-Entry($r) {
    $k = "$($r.family)|$($r.source)|$($r.id)"
    $kind = $r.kind; $level = $r.level; $target = $r.target; $note = $null
    if ($overrides.ContainsKey($k)) { $o = $overrides[$k]; $kind = $o.kind; $level = $o.level; $target = $o.target; $note = $o.note }
    $ec = Parse-ErrorCode $r.desc_en
    $fr = Make-Fr $r $ec
    $e = [ordered]@{
        source = $r.source; ids = @([int]$r.id); name = $r.name; kind = $kind; level = $level; target = $target
        page = $r.page; error_code = $ec; timing = $r.timing
        desc_en = $r.desc_en
        desc_fr = $(if ($fr) { $fr.text } else { $null })
        translation = $(if ($fr) { $fr.how } else { 'todo' })
        import = 'auto'
    }
    if ($note) { $e['manual_note'] = $note }
    if ($fr) { $script:stats.fr_ok++ } else { $script:stats.fr_todo++; $script:todo.Add("$($r.family) $($r.source) $($r.id) $($r.name)") }
    return $e
}

# --- modulaire : compléter le catalogue relu -----------------------------------------
$have = @{}
foreach ($e in $cur.events) { foreach ($id in $e.ids) { $have["$($e.source):$id"] = $true } }
$events = New-Object System.Collections.Generic.List[object]
foreach ($e in $cur.events) {
    if (-not $e.PSObject.Properties['import']) { $e | Add-Member -NotePropertyName import -NotePropertyValue 'curated' }
    $events.Add($e)
}
foreach ($r in ($rows | Where-Object { $_.family -eq 'modular' })) {
    if ($have.ContainsKey("$($r.source):$($r.id)")) { continue }
    $events.Add((Make-Entry $r)); $stats.modular_new++
}
$sorted = $events | Sort-Object @{e={ switch ($_.source) { 'UPM' {0} 'MCU' {1} default {2} } }}, @{e={ [int]$_.ids[0] }}
$cur.events = @($sorted)
$cur._status = "COMPLET (extraction automatique v0.3 + sélection relue v0.1). Entrées import='curated' : relues à la main ; import='auto' : extraites par tools/import-alarms.ps1 du texte du manuel, à relire. desc_en = texte source ; desc_fr = traduction (translation: curated | reused | dictionary | template | todo)."
$cur | ConvertTo-Json -Depth 8 | Out-File $modPath -Encoding utf8

# --- monobloc : nouveau catalogue ---------------------------------------------------
$mono = New-Object System.Collections.Generic.List[object]
foreach ($r in ($rows | Where-Object { $_.family -eq 'monoblock' })) { $mono.Add((Make-Entry $r)); $stats.mono++ }
$monoDir = Join-Path $Root 'packs\93ps'
New-Item -ItemType Directory -Force $monoDir | Out-Null
$monoDoc = [ordered]@{
    _source = 'Alarms Manual for Eaton, P-164000681 rev 003 (2023), section 3 : 91PS/93PS Monoblock UPS, 8-10 kVA (UPM 0-138, CSB 192-280). Pas de MCU en monobloc.'
    _status = 'Extraction automatique à relire. La numérotation CSB (192-280) recouvre la numérotation MCU du catalogue modulaire : un événement se désigne par (famille, source, id).'
    family  = 'monoblock'
    events  = @($mono | Sort-Object @{e={ $_.source }}, @{e={ [int]$_.ids[0] }})
}
$monoDoc | ConvertTo-Json -Depth 8 | Out-File (Join-Path $monoDir 'alarms.monoblock.json') -Encoding utf8

$todo | Out-File (Join-Path $env:TEMP 'alarms-translation-todo.txt') -Encoding utf8
Write-Host ("Modulaire : +{0} entrées ; monobloc : {1} entrées ; FR renseigné : {2} ; à traduire : {3}" -f $stats.modular_new, $stats.mono, $stats.fr_ok, $stats.fr_todo)
Write-Host "Liste à traduire : $(Join-Path $env:TEMP 'alarms-translation-todo.txt')"




