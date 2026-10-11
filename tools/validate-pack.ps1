# Valide un pack de modèle : JSON valide, événements uniques par (famille, source, id),
# cohérence des codes d'erreur, kits qui ne référencent que des pièces connues,
# indices alarme -> pièce cohérents avec le catalogue.
# Usage : powershell -File tools\validate-pack.ps1 -Pack packs\93pm
param([Parameter(Mandatory=$true)][string]$Pack)

$ErrorActionPreference = 'Stop'
$errors = New-Object System.Collections.Generic.List[string]
$warns  = New-Object System.Collections.Generic.List[string]

function Load($name, [bool]$required = $true) {
    $p = Join-Path $Pack $name
    if (-not (Test-Path $p)) { if ($required) { $errors.Add("fichier manquant : $name") }; return $null }
    try { Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $errors.Add("JSON invalide dans $name : $($_.Exception.Message)"); $null }
}

function Check-Events($doc, $label) {
    $seen = @{}; $count = 0
    $kinds = 'alarm','sticky_alarm','notice','sticky_notice','status','command'
    foreach ($e in $doc.events) {
        if (-not $e.name) { $errors.Add("$label : événement sans nom ($($e.source) $($e.ids -join ','))") }
        if ($e.kind -and $e.kind -notin $kinds) { $errors.Add("$label : kind inconnu '$($e.kind)' ($($e.source) $($e.ids -join ','))") }
        if (-not $e.desc_fr) { $warns.Add("$label : desc_fr manquant ($($e.source) $($e.ids -join ','))") }
        foreach ($id in $e.ids) {
            $count++
            $key = "$($e.source):$id"
            if ($seen.ContainsKey($key)) { $errors.Add("$label : événement dupliqué $key ('$($e.name)' et '$($seen[$key])')") }
            else { $seen[$key] = $e.name }
        }
        $t = $e.error_code.type
        if (-not $t) { $errors.Add("$label : error_code.type manquant ($($e.source) $($e.ids -join ','))") }
        elseif ($t -notin 'none','enum','bitfield','phases') { $errors.Add("$label : error_code.type inconnu '$t' ($($e.source) $($e.ids -join ','))") }
        elseif ($t -in 'enum','bitfield' -and -not ($e.error_code.values -or $e.error_code.bits)) {
            $warns.Add("$label : codes décrits mais vides ($($e.source) $($e.ids -join ',') $($e.name))")
        }
    }
    $bySrc = $doc.events | Group-Object source | ForEach-Object { "$($_.Name)=$(($_.Group | ForEach-Object { $_.ids.Count } | Measure-Object -Sum).Sum)" }
    $auto = @($doc.events | Where-Object { $_.import -eq 'auto' }).Count
    $cur  = @($doc.events | Where-Object { $_.import -eq 'curated' }).Count
    Write-Host "$label : $count identifiants ($($bySrc -join ', ')) - relus: $cur, auto: $auto"
    return $seen
}

$meta = Load 'pack.json'
if ($meta -and $meta.contents) {
    foreach ($f in $meta.contents) {
        $fp = Join-Path $Pack $f
        if (-not (Test-Path $fp)) { $errors.Add("pack.json déclare '$f' mais le fichier est absent"); continue }
        try { $null = Get-Content $fp -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $errors.Add("JSON invalide dans $f : $($_.Exception.Message)") }
    }
}

$known = @{}
$alarms = Load 'alarms.json' $false
if ($alarms) { $s = Check-Events $alarms 'alarms.json'; foreach ($k in $s.Keys) { $known[$k] = $true } }
$mono = Load 'alarms.monoblock.json' $false
if ($mono) { $null = Check-Events $mono 'alarms.monoblock.json' }

$parts = Load 'parts.json' $false
if ($parts) {
    $refs = @{}
    foreach ($p in $parts.parts) {
        if ($refs.ContainsKey($p.ref)) { $errors.Add("pièce dupliquée : $($p.ref)") } else { $refs[$p.ref] = $p.label }
    }
    foreach ($k in $parts.kits) {
        foreach ($it in $k.items) { if (-not $refs.ContainsKey($it[0])) { $errors.Add("kit $($k.kit) : pièce inconnue $($it[0])") } }
    }
    if ($parts.kits_legacy_2013) {
        foreach ($k in $parts.kits_legacy_2013.kits) {
            foreach ($it in $k.items) { if (-not $refs.ContainsKey($it[0])) { $errors.Add("kit legacy $($k.kit) : pièce inconnue $($it[0])") } }
        }
    }
    foreach ($h in $parts.alarm_to_part_hints.PSObject.Properties) {
        if ($h.Name.StartsWith('_')) { continue }
        if ($alarms -and $h.Name -ne 'CSB:HMI' -and -not $known.ContainsKey($h.Name)) { $errors.Add("indice $($h.Name) : événement absent de alarms.json") }
        foreach ($r in $h.Value.candidate_parts) { if (-not $refs.ContainsKey($r)) { $errors.Add("indice $($h.Name) : pièce inconnue $r") } }
    }
    Write-Host "parts.json : $($refs.Count) références, $($parts.kits.Count) kits"
}

$lists = Load 'checklists.draft.json' $false
if ($lists) { Write-Host "checklists.draft.json : $($lists.checklists.Count) (brouillon)" }

if ($warns.Count -gt 0) {
    Write-Host "`nAVERTISSEMENTS ($($warns.Count)) :" -ForegroundColor Yellow
    $warns | Select-Object -First 15 | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
    if ($warns.Count -gt 15) { Write-Host " ... et $($warns.Count - 15) autres" -ForegroundColor Yellow }
}
if ($errors.Count -gt 0) {
    Write-Host "`nERREURS ($($errors.Count)) :" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    exit 1
}
Write-Host "`nPack '$($meta.pack_id)' v$($meta.pack_version) : OK" -ForegroundColor Green

