param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Dest,
  [int]$Size = 64
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Save-Scaled([System.Drawing.Image]$img, [string]$outPath, [int]$px) {
  $bmp = New-Object System.Drawing.Bitmap $px, $px
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $px, $px)
  $dir = Split-Path -Parent $outPath
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

$src = $Source.Trim().Trim('"')
if ($src -match ',\-?\d+$') { $src = $src -replace ',\-?\d+$', '' }
if (-not (Test-Path -LiteralPath $src)) { throw "missing $src" }

$ext = [IO.Path]::GetExtension($src).ToLowerInvariant()
if ($ext -in @('.png', '.jpg', '.jpeg', '.bmp', '.gif')) {
  $img = [System.Drawing.Image]::FromFile($src)
  try { Save-Scaled $img $Dest $Size } finally { $img.Dispose() }
  exit 0
}

if ($ext -eq '.ico') {
  $icon = New-Object System.Drawing.Icon $src, $Size, $Size
  try {
    Save-Scaled $icon.ToBitmap() $Dest $Size
  } finally { $icon.Dispose() }
  exit 0
}

$assoc = [System.Drawing.Icon]::ExtractAssociatedIcon($src)
if (-not $assoc) { throw "no icon $src" }
try {
  Save-Scaled $assoc.ToBitmap() $Dest $Size
} finally { $assoc.Dispose() }
