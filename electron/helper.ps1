param(
  [switch]$Once,
  [int]$IntervalMs = 1000
)

$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class TimeboardNative {
  [StructLayout(LayoutKind.Sequential)]
  public struct LASTINPUTINFO {
    public uint cbSize;
    public uint dwTime;
  }

  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

  [DllImport("user32.dll")]
  public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

  public static uint GetIdleMs() {
    LASTINPUTINFO info = new LASTINPUTINFO();
    info.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));
    GetLastInputInfo(ref info);
    return unchecked((uint)Environment.TickCount) - info.dwTime;
  }
}
"@

function Get-ForegroundSnapshot {
  $hwnd = [TimeboardNative]::GetForegroundWindow()
  $pid = [uint32]0
  [void][TimeboardNative]::GetWindowThreadProcessId($hwnd, [ref]$pid)
  $titleBuf = New-Object System.Text.StringBuilder 1024
  [void][TimeboardNative]::GetWindowText($hwnd, $titleBuf, $titleBuf.Capacity)
  $proc = $null
  if ($pid -gt 0) {
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
  }
  $idleMs = [int64][TimeboardNative]::GetIdleMs()
  $path = $null
  if ($proc -and $proc.Path) { $path = [string]$proc.Path }
  $name = if ($proc) { [string]$proc.ProcessName } else { '' }
  $title = [string]$titleBuf.ToString()
  $obj = [ordered]@{
    ts      = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    pid     = [int]$pid
    name    = $name
    title   = $title
    path    = $path
    idleMs  = $idleMs
  }
  return ($obj | ConvertTo-Json -Compress)
}

if ($Once) {
  Write-Output (Get-ForegroundSnapshot)
  exit 0
}

while ($true) {
  try {
    Write-Output (Get-ForegroundSnapshot)
  } catch {
    $err = [ordered]@{
      ts     = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
      error  = [string]$_.Exception.Message
      idleMs = 0
    }
    Write-Output ($err | ConvertTo-Json -Compress)
  }
  Start-Sleep -Milliseconds $IntervalMs
}
