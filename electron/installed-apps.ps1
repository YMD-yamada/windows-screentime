$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$apps = New-Object System.Collections.Generic.List[object]

function Add-UninstallHive([string]$keyPath, [string]$hive) {
  Get-ChildItem $keyPath -ErrorAction SilentlyContinue | ForEach-Object {
    $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
    if (-not $p -or -not $p.DisplayName) { return }
    if ($p.SystemComponent -eq 1) { return }
    if ($p.ReleaseType -match 'Update|Hotfix|ServicePack') { return }
    if ($p.DisplayName -match '^(KB\d+|Security Update|Update for)') { return }
    $apps.Add([ordered]@{
      id              = "$hive|$($_.PSChildName)"
      name            = [string]$p.DisplayName
      publisher       = [string]$p.Publisher
      version         = [string]$p.DisplayVersion
      installDate     = [string]$p.InstallDate
      type            = 'win32'
      uninstall       = [string]$p.QuietUninstallString
      uninstallOpen   = [string]$p.UninstallString
      installLocation = [string]$p.InstallLocation
      displayIcon     = [string]$p.DisplayIcon
      sizeKb          = $(if ($p.EstimatedSize) { [int]$p.EstimatedSize } else { $null })
    }) | Out-Null
  }
}

Add-UninstallHive 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall' 'HKLM'
Add-UninstallHive 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall' 'HKLM32'
Add-UninstallHive 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall' 'HKCU'

Get-AppxPackage -ErrorAction SilentlyContinue |
  Where-Object { -not $_.IsFramework -and -not $_.NonRemovable } |
  ForEach-Object {
    $display = [string]$_.Name
    $manifest = Join-Path $_.InstallLocation 'AppxManifest.xml'
    if (Test-Path $manifest) {
      $xml = Get-Content -LiteralPath $manifest -Raw -ErrorAction SilentlyContinue
      if ($xml -match 'DisplayName="([^"]+)"' -and $Matches[1] -notmatch 'ms-resource') {
        $display = [string]$Matches[1]
      }
    }
    $apps.Add([ordered]@{
      id                = "store|$($_.PackageFullName)"
      name              = $display
      publisher         = [string]$_.Publisher
      version           = [string]$_.Version
      type              = 'store'
      packageFamilyName = [string]$_.PackageFamilyName
      installLocation   = [string]$_.InstallLocation
    }) | Out-Null
  }

$switched = @{}
$swPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\FeatureUsage\AppSwitched'
if (Test-Path $swPath) {
  $props = Get-ItemProperty $swPath -ErrorAction SilentlyContinue
  if ($props) {
    $props.PSObject.Properties |
      Where-Object {
        $_.Name -notmatch '^PS' -and (
          $_.Value -is [int] -or $_.Value -is [long] -or $_.Value -is [uint32] -or $_.Value -is [int64]
        )
      } |
      ForEach-Object { $switched[$_.Name] = [int]$_.Value }
  }
}

$result = [ordered]@{
  capturedAt = [DateTimeOffset]::Now.ToString('o')
  apps       = $apps
  switched   = $switched
}
$result | ConvertTo-Json -Compress -Depth 6
