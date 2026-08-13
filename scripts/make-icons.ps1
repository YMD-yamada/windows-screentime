# Generate Timeboard icon.png / Store logos / a desktop screenshot mock.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$build = Join-Path $root 'build'
$store = Join-Path $root 'store'
New-Item -ItemType Directory -Force -Path $build | Out-Null
New-Item -ItemType Directory -Force -Path $store | Out-Null

function New-Graphics([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  return @{ Bmp = $bmp; G = $g }
}

function Save-Png($bmp, $path) {
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

$accent = [System.Drawing.Color]::FromArgb(255, 47, 111, 94)
$accentSoft = [System.Drawing.Color]::FromArgb(255, 220, 238, 231)
$bg = [System.Drawing.Color]::FromArgb(255, 244, 241, 234)
$card = [System.Drawing.Color]::FromArgb(255, 255, 253, 248)
$ink = [System.Drawing.Color]::FromArgb(255, 28, 28, 26)
$muted = [System.Drawing.Color]::FromArgb(255, 107, 106, 100)
$white = [System.Drawing.Color]::White

$icon = New-Graphics 512 512
$icon.G.Clear($accent)
$penWhite = New-Object System.Drawing.Pen $white, 28
$penWhite.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$penWhite.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$icon.G.DrawEllipse($penWhite, 86, 86, 340, 340)
$icon.G.DrawLine($penWhite, 256, 256, 256, 150)
$icon.G.DrawLine($penWhite, 256, 256, 340, 256)
$barBrush = New-Object System.Drawing.SolidBrush $accentSoft
$icon.G.FillRectangle($barBrush, 300, 330, 28, 70)
$icon.G.FillRectangle($barBrush, 340, 300, 28, 100)
$icon.G.FillRectangle($barBrush, 380, 250, 28, 150)
Save-Png $icon.Bmp (Join-Path $build 'icon.png')
$icon.G.Dispose(); $icon.Bmp.Dispose()

foreach ($size in 44, 50, 150, 256) {
  $src = New-Object System.Drawing.Bitmap (Join-Path $build 'icon.png')
  $dst = New-Graphics $size $size
  $dst.G.Clear($accent)
  $dst.G.DrawImage($src, 0, 0, $size, $size)
  Save-Png $dst.Bmp (Join-Path $build ("icon-{0}.png" -f $size))
  $dst.G.Dispose(); $dst.Bmp.Dispose(); $src.Dispose()
}

$shot = New-Graphics 1366 768
$shot.G.Clear($bg)
$cardBrush = New-Object System.Drawing.SolidBrush $card
$inkBrush = New-Object System.Drawing.SolidBrush $ink
$mutedBrush = New-Object System.Drawing.SolidBrush $muted
$accentBrush = New-Object System.Drawing.SolidBrush $accent
$softBrush = New-Object System.Drawing.SolidBrush $accentSoft
$ff = New-Object System.Drawing.FontFamily 'Segoe UI'
$fontTitle = New-Object System.Drawing.Font $ff, 36, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Point)
$fontBody = New-Object System.Drawing.Font $ff, 16, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Point)
$fontSmall = New-Object System.Drawing.Font $ff, 13, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Point)
$fontBig = New-Object System.Drawing.Font $ff, 48, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Point)

$shot.G.FillRectangle($cardBrush, 48, 40, 1270, 688)
$shot.G.DrawString('Timeboard', $fontTitle, $inkBrush, 80, 70)
$shot.G.DrawString('App usage time for Windows. Everything stays on this PC.', $fontBody, $mutedBrush, 80, 130)
$shot.G.FillRectangle($softBrush, 80, 200, 360, 220)
$shot.G.DrawString('Today', $fontSmall, $mutedBrush, 104, 224)
$shot.G.DrawString('2h 18m', $fontBig, $accentBrush, 104, 268)
$shot.G.DrawString('Idle 41m', $fontSmall, $mutedBrush, 104, 360)

$apps = @(
  @{ n = 'Cursor'; w = 520 },
  @{ n = 'Chrome'; w = 410 },
  @{ n = 'Explorer'; w = 260 },
  @{ n = 'LINE'; w = 180 },
  @{ n = 'Notepad'; w = 90 }
)
$y = 210
foreach ($a in $apps) {
  $shot.G.DrawString($a.n, $fontSmall, $inkBrush, 480, [single]$y)
  $shot.G.FillRectangle($softBrush, 620, $y + 8, 620, 18)
  $shot.G.FillRectangle($accentBrush, 620, $y + 8, [int]$a.w, 18)
  $y += 52
}
$shot.G.DrawString('Independent app. Not affiliated with Apple Screen Time.', $fontSmall, $mutedBrush, 80, 660)
Save-Png $shot.Bmp (Join-Path $store 'screenshot-1366x768.png')
$shot.G.Dispose(); $shot.Bmp.Dispose()

Write-Output 'Wrote build/icon.png and store/screenshot-1366x768.png'
