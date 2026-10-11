# Serveur statique local pour tester l'application (aucune dépendance).
# Sert la racine du projet : /app/ (application) et /packs/ (données).
#   powershell -File tools\serve.ps1            -> http://localhost:8080/app/
param([int]$Port = 8080)

$root = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
$mime = @{
    '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'; '.webmanifest' = 'application/manifest+json; charset=utf-8'
    '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.ico' = 'image/x-icon'
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serveur : http://localhost:$Port/app/   (Ctrl+C pour arrêter)  racine=$root"
try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
        if ($rel -eq '') { $rel = 'app/index.html' }
        if ($rel.EndsWith('/')) { $rel += 'index.html' }
        $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
        $res = $ctx.Response
        # interdit de sortir de la racine du projet ; n'expose ni les sources PDF ni les outils
        $allowed = $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and
                   ($full.StartsWith((Join-Path $root 'app'), [StringComparison]::OrdinalIgnoreCase) -or
                    $full.StartsWith((Join-Path $root 'packs'), [StringComparison]::OrdinalIgnoreCase))
        if ($allowed -and (Test-Path $full -PathType Leaf)) {
            $ext = [System.IO.Path]::GetExtension($full).ToLower()
            $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($full)
            $res.Headers.Add('Cache-Control', 'no-cache')
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            $b = [System.Text.Encoding]::UTF8.GetBytes('404')
            $res.OutputStream.Write($b, 0, $b.Length)
        }
        $res.Close()
    }
} finally { $listener.Stop() }
