$ErrorActionPreference = "Stop"

$port = 1420

function Get-ListeningPid([int]$TargetPort) {
    $matches = cmd /c "netstat -ano | findstr :$TargetPort" 2>$null
    if (-not $matches) {
        return $null
    }

    foreach ($line in $matches) {
        if ($line -match "LISTENING\s+(\d+)\s*$") {
            return [int]$matches[1]
        }
    }

    return $null
}

$existingPid = Get-ListeningPid -TargetPort $port
if ($existingPid) {
    Write-Host "Port $port is already in use by PID $existingPid. Stopping it before launching Vite..."
    Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

# Kill any stale vocaltype instance to avoid single-instance blocking the new dev session
$stale = Get-Process -Name "vocaltype" -ErrorAction SilentlyContinue
if ($stale) {
    Write-Host "Stopping stale vocaltype instance(s)..."
    $stale | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

$viteArgs = @("run", "dev", "--", "--strictPort")
& bun @viteArgs
exit $LASTEXITCODE
