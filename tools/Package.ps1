$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$taskRoot = Split-Path $PSScriptRoot -Parent
$extensionDirectory = Join-Path $taskRoot 'extension'
$manifest = Get-Content -LiteralPath (Join-Path $extensionDirectory 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$package = Get-Content -LiteralPath (Join-Path $taskRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest.manifest_version -ne 3 -or $manifest.version -ne $package.version) {
    throw 'Expected Manifest V3 and matching package versions.'
}
foreach ($relative in @($manifest.chrome_url_overrides.newtab, $manifest.background.service_worker) + @($manifest.icons.PSObject.Properties.Value)) {
    if (-not (Test-Path -LiteralPath (Join-Path $extensionDirectory $relative) -PathType Leaf)) {
        throw "Missing extension asset: $relative"
    }
}
$artifactDirectory = Join-Path $taskRoot 'artifacts'
[System.IO.Directory]::CreateDirectory($artifactDirectory) | Out-Null
$zipPath = Join-Path $artifactDirectory "daymark-start-$($manifest.version).zip"
$stream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
try {
    $zip = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create, $true)
    try {
        foreach ($file in Get-ChildItem -LiteralPath $extensionDirectory -Recurse -File | Sort-Object FullName) {
            $relative = $file.FullName.Substring($extensionDirectory.Length + 1).Replace('\', '/')
            $entry = $zip.CreateEntry($relative, [System.IO.Compression.CompressionLevel]::Optimal)
            $source = [System.IO.File]::OpenRead($file.FullName)
            $target = $entry.Open()
            try { $source.CopyTo($target) } finally { $source.Dispose(); $target.Dispose() }
        }
    } finally { $zip.Dispose() }
} finally { $stream.Dispose() }
Copy-Item -LiteralPath $zipPath -Destination (Join-Path $artifactDirectory 'daymark-start.zip') -Force
$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText("$zipPath.sha256", "$hash  $([System.IO.Path]::GetFileName($zipPath))`n")
Write-Output "Package: $zipPath"
Write-Output "SHA256: $hash"
