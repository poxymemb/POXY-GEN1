# POXY local static server (port 3456).
# Fixes "connection closed unexpectedly" when two python servers bind the same port.
param(
  [int]$Port = 3456
)

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$listeners = netstat -ano | Select-String "127.0.0.1:$Port\s+.*LISTENING"
$pids = @()
foreach ($line in $listeners) {
  $pid = ($line -split '\s+')[-1]
  if ($pid -and $pid -ne '0' -and $pids -notcontains $pid) { $pids += $pid }
}
if ($pids.Count -gt 0) {
  Write-Host "Stopping existing listener(s) on port $Port : $($pids -join ', ')"
  foreach ($pid in $pids) { Stop-Process -Id $pid -Force }
  Start-Sleep -Seconds 1
}

Write-Host "Serving POXY at http://127.0.0.1:$Port/"
Write-Host "Katana Rive test: http://127.0.0.1:$Port/design/rive/katana-test.html"
python -m http.server $Port --bind 127.0.0.1
