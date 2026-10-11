# Extrait les événements du manuel d'alarmes Eaton (texte produit par pdftotext -layout)
# vers un JSON brut, un objet par ligne de tableau. Aucune interprétation métier : la
# fusion avec le catalogue relu à la main est faite par merge-alarms.ps1.
#
#   pdftotext -layout Alarms_Manual_For_Eaton_Rev03.pdf alarms.txt
#   powershell -File tools\import-alarms.ps1 -Text alarms.txt -Out alarms.raw.json
param(
    [Parameter(Mandatory=$true)][string]$Text,
    [Parameter(Mandatory=$true)][string]$Out
)
$ErrorActionPreference = 'Stop'
$lines = Get-Content $Text -Encoding UTF8

function Indent([string]$s) { return ($s.Length - $s.TrimStart().Length) }

$family = $null      # modular | monoblock
$source = $null      # UPM | MCU | CSB
$entries = New-Object System.Collections.Generic.List[object]
$pendingPage = New-Object System.Collections.Generic.List[object]
$cur = $null
$rowRe = '^\s{0,2}(\S.*?)\s{2,}(\d{1,3})\s{2,}(\S.*)$'
$stop = $false

function Finish-Entry {
    if ($script:cur -ne $null) {
        $script:entries.Add($script:cur)
        $script:pendingPage.Add($script:cur)
        $script:cur = $null
    }
}

for ($i = 0; $i -lt $lines.Count -and -not $stop; $i++) {
    $l = $lines[$i]
    $c = ($l -replace '\s','')
    if ($l -match '\. \. \.' -or $l -match '\.{5,}') { continue }            # table des matières

    if ($c -match '^APPENDIX[AB]:Relayalarms$') { Finish-Entry; $stop = $true; continue }
    if ($c -match 'ALARMSMANUALFOREATONP-164000681-0032023(\d+)$') {
        # Un saut de page ne termine PAS l'entrée courante (description ou nom qui continue sur la page suivante).
        $pg = [int]$Matches[1]
        foreach ($e in $pendingPage) { $e.page = $pg }
        $pendingPage.Clear()
        if ($null -ne $cur -and $null -eq $cur.page) { $cur.page = $pg }
        continue
    }
    if ($c -match '^2(91PS|\.)?.*Modular' -and $c -match 'Modular') { Finish-Entry; $family = 'modular'; $source = $null; continue }
    if ($c -match '^3.*Monoblock' -and $c -match '91PS/93PSMonoblock') { Finish-Entry; $family = 'monoblock'; $source = $null; continue }
    if ($c -match '^[23]\.[123]UPMevents$')  { Finish-Entry; $source = 'UPM'; continue }
    if ($c -match '^[23]\.[123]MCUevents$')  { Finish-Entry; $source = 'MCU'; continue }
    if ($c -match '^[23]\.[123]CSBevents$')  { Finish-Entry; $source = 'CSB'; continue }
    if ($c -match '^[23]\.\d\.\d.*events\d+\.\.\.\d+$') { continue }   # sous-titres 2.1.1 ...
    if ($null -eq $family -or $null -eq $source) { continue }

    if ($c -match '^(Event|Alarm|number|Type|Scan|\(ms\)|Activate|Deactivate|Log|Description)+$') { continue }
    if ($c -match '^Eventsarelistedinnumericalorder' -or $c -match '^NOTE:') { continue }

    if ($l -match $rowRe -and (Indent $l) -le 2) {
        Finish-Entry
        $name = $Matches[1].Trim()
        $id   = [int]$Matches[2]
        $cells = ($Matches[3] -split '\s{2,}') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
        $cur = [ordered]@{
            family = $family; source = $source; id = $id; name = $name
            type_cells = New-Object System.Collections.Generic.List[string]
            timing = @($cells | Select-Object -Skip 1)
            desc = New-Object System.Collections.Generic.List[string]
            in_desc = $false; page = $null
        }
        if ($cells.Count -gt 0) { $cur.type_cells.Add($cells[0]) }
        continue
    }
    if ($null -eq $cur) { continue }

    if ($l.Trim() -eq '') { continue }
    $ind = Indent $l
    if (-not $cur.in_desc) {
        if ($ind -ge 8 -and $ind -lt 24) { $cur.in_desc = $true }
        elseif ($ind -ge 24) {
            $parts = ($l.Trim() -split '\s{2,}')
            foreach ($p in $parts) { $cur.type_cells.Add($p) }
            continue
        } else {
            $m = [regex]::Match($l, '^(\s{0,2}\S.*?)(\s{2,})(\S.*)$')
            if ($m.Success -and $m.Groups[3].Index -lt 24) {
                # fin du nom + début de la description sur la même ligne
                $cur.name = ($cur.name + ' ' + $m.Groups[1].Value.Trim()).Trim()
                $cur.in_desc = $true
                $cur.desc.Add($m.Groups[3].Value.Trim())
                continue
            }
            $parts = ($l.Trim() -split '\s{2,}', 2)
            $cur.name = ($cur.name + ' ' + $parts[0]).Trim()
            if ($parts.Count -gt 1) { foreach ($p in ($parts[1] -split '\s{2,}')) { $cur.type_cells.Add($p) } }
            continue
        }
    }
    # Fragment de nom qui déborde sur la colonne description (ex. "Level4      • 1 = ...")
    if ($ind -le 2 -and $l -match '^\s{0,2}([A-Za-z0-9]{2,14}(?:\s[A-Za-z0-9]{2,14})?)\s{3,}(\S.*)$' -and $Matches[1] -ne 'Reserved') {
        $cur.name = ($cur.name + ' ' + $Matches[1]).Trim()
        $cur.desc.Add($Matches[2].Trim())
        continue
    }
    $cur.desc.Add($l.Trim())
}
Finish-Entry

$result = foreach ($e in $entries) {
    $t = ($e.type_cells -join ' ')
    $level = $null; $target = $null
    if ($t -match '(\d+)\s*(User|Service)\b') { $level = [int]$Matches[1]; $target = $Matches[2].ToLower() }
    elseif ($t -match 'Level\s*(\d+)') {
        $level = [int]$Matches[1]
        if ($t -match '\b(User|Service)\b') { $target = $Matches[1].ToLower() }
    }
    $kind = $null
    if ($t -match 'Sticky\s+Alarm') { $kind = 'sticky_alarm' }
    elseif ($t -match 'Sticky\s+Notice') { $kind = 'sticky_notice' }
    elseif ($t -match 'Command') { $kind = 'command' }
    elseif ($t -match 'Status') { $kind = 'status' }
    elseif ($t -match 'Notice|notice') { $kind = 'notice' }
    elseif ($t -match 'Alarm|alarm') { $kind = 'alarm' }
    elseif ($t -match 'Event\s+level') { $kind = 'notice' }
    [pscustomobject]@{
        family = $e.family; source = $e.source; id = $e.id
        name = ($e.name -replace '\s*Error code:','' -replace '([a-z])-\s*([a-z]{2,})','$1$2' -replace '\s+',' ').Trim()
        kind = $kind; level = $level; target = $target
        type_raw = $t; timing = ($e.timing -join ' | ')
        page = $e.page; desc_en = ($e.desc -join "`n")
    }
}
[IO.File]::WriteAllText($Out, ($result | ConvertTo-Json -Depth 4), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Entrées extraites : $($entries.Count)"
$result | Group-Object family, source | ForEach-Object { "{0} : {1}" -f $_.Name, $_.Count }






