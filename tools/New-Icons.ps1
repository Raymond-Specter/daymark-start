$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path $PSScriptRoot -Parent
$iconDirectory = Join-Path $taskRoot 'extension/icons'
[System.IO.Directory]::CreateDirectory($iconDirectory) | Out-Null

# Draw the same original D / clock mark at each size; no external artwork or dependencies.
foreach ($size in @(16, 32, 48, 128)) {
    $bitmap = [System.Drawing.Bitmap]::new($size * 4, $size * 4)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.ScaleTransform($size / 32.0, $size / 32.0)
    $tile = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $tile.AddArc(16, 16, 28, 28, 180, 90)
    $tile.AddArc(84, 16, 28, 28, 270, 90)
    $tile.AddArc(84, 84, 28, 28, 0, 90)
    $tile.AddArc(16, 84, 28, 28, 90, 90)
    $tile.CloseFigure()
    $fill = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#202326'))
    $ink = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#F5F5F2'), 7)
    $accent = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#A8D8C0'), 5)
    $ink.StartCap = $ink.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $accent.StartCap = $accent.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.FillPath($fill, $tile)
    $graphics.DrawLine($ink, 44, 41, 44, 87)
    $graphics.DrawArc($ink, 22, 41, 54, 46, -90, 180)
    $graphics.DrawLine($accent, 61, 54, 61, 66)
    $graphics.DrawLine($accent, 61, 66, 69, 71)
    $output = [System.Drawing.Bitmap]::new($size, $size)
    $outputGraphics = [System.Drawing.Graphics]::FromImage($output)
    $outputGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $outputGraphics.DrawImage($bitmap, 0, 0, $size, $size)
    $output.Save((Join-Path $iconDirectory "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $outputGraphics.Dispose(); $output.Dispose()
    $accent.Dispose(); $ink.Dispose(); $fill.Dispose(); $tile.Dispose()
    $graphics.Dispose(); $bitmap.Dispose()
}
Write-Output 'Generated extension icons (16, 32, 48, 128 px).'
