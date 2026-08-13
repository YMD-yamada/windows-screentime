param(
  [Parameter(Mandatory = $true)][string]$SpecFile
)

$ErrorActionPreference = 'Stop'
$spec = Get-Content -LiteralPath $SpecFile -Raw -Encoding UTF8 | ConvertFrom-Json

function Invoke-Wait([string]$file, [string[]]$argList) {
  $p = Start-Process -FilePath $file -ArgumentList $argList -Wait -PassThru -WindowStyle Hidden
  if ($null -eq $p) { exit 1 }
  exit $p.ExitCode
}

try {
  switch ($spec.kind) {
    'msi' {
      Invoke-Wait "$env:SystemRoot\System32\msiexec.exe" @('/x', [string]$spec.guid, '/qn', '/norestart')
    }
    'store' {
      Remove-AppxPackage -Package ([string]$spec.package)
      exit 0
    }
    'cmd' {
      Invoke-Wait "$env:SystemRoot\System32\cmd.exe" @('/c', [string]$spec.command)
    }
    default { exit 1 }
  }
} finally {
  Remove-Item -LiteralPath $SpecFile -Force -ErrorAction SilentlyContinue
}
