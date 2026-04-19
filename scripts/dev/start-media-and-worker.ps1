param(
  [switch]$Local
)

$ErrorActionPreference = "Stop"

function Get-EnvOrDefault {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$DefaultValue
  )

  $value = [System.Environment]::GetEnvironmentVariable($Name, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $DefaultValue
  }

  return $value
}

function Get-WorldBridgeConfig {
  $bridgeUrl = Get-EnvOrDefault -Name "WORLD_KERNEL_BRIDGE_URL" -DefaultValue "http://127.0.0.1:8790/advance"
  $bridgeToken = [System.Environment]::GetEnvironmentVariable("WORLD_KERNEL_BRIDGE_TOKEN", "Process")

  try {
    $bridgeUri = [System.Uri]$bridgeUrl
  }
  catch {
    throw "WORLD_KERNEL_BRIDGE_URL must be a valid absolute URL. Current value: $bridgeUrl"
  }

  if (-not $bridgeUri.IsAbsoluteUri) {
    throw "WORLD_KERNEL_BRIDGE_URL must be absolute. Current value: $bridgeUrl"
  }

  return [pscustomobject]@{
    Url = $bridgeUrl
    Host = $bridgeUri.Host
    Port = $bridgeUri.Port
    Token = $bridgeToken
  }
}

function Resolve-PythonExecutable {
  $venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
  if (Test-Path $venvPython) {
    return $venvPython
  }

  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) { return "py" }

  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) { return "python" }

  throw "Python executable not found. Install Python or add it to PATH."
}

function Import-DevVars {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath
  )

  if (-not (Test-Path $FilePath)) {
    return
  }

  Get-Content -Path $FilePath | ForEach-Object {
    $line = ([string]$_).Trim()
    if (-not $line) { return }
    if ($line.StartsWith("#")) { return }
    $eqIdx = $line.IndexOf("=")
    if ($eqIdx -lt 1) { return }

    $key = $line.Substring(0, $eqIdx).Trim()
    $value = $line.Substring($eqIdx + 1).Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ($key) {
      [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$devVarsPath = Join-Path $repoRoot ".dev.vars"
if (Test-Path $devVarsPath) {
  Write-Output "[ION-dev] Loading environment from .dev.vars"
  Import-DevVars -FilePath $devVarsPath
}
$pythonExe = Resolve-PythonExecutable
$mediaProcess = $null
$worldBridgeProcess = $null
$workerExitCode = 0
$wranglerArgs = @("wrangler", "dev")
if ($Local) {
  $wranglerArgs += "--local"
}

$worldBridge = Get-WorldBridgeConfig

Write-Output "[ION-dev] Starting ION media service (python -m ION_media.run_server)..."

try {
  $mediaProcess = Start-Process -FilePath $pythonExe -ArgumentList @("-m", "ION_media.run_server") -WorkingDirectory $repoRoot -PassThru -NoNewWindow
  Start-Sleep -Milliseconds 600

  if ($mediaProcess.HasExited) {
    throw "ION media service exited immediately with code $($mediaProcess.ExitCode)."
  }

  Write-Output "[ION-dev] ION media service PID: $($mediaProcess.Id)"
  Write-Output "[ION-dev] Starting sovereign world bridge ($($worldBridge.Url))..."

  [System.Environment]::SetEnvironmentVariable("ION_WORLD_BRIDGE_HOST", $worldBridge.Host, "Process")
  [System.Environment]::SetEnvironmentVariable("ION_WORLD_BRIDGE_PORT", [string]$worldBridge.Port, "Process")
  if (-not [string]::IsNullOrWhiteSpace($worldBridge.Token)) {
    [System.Environment]::SetEnvironmentVariable("ION_WORLD_BRIDGE_TOKEN", $worldBridge.Token, "Process")
  }

  $worldBridgeProcess = Start-Process -FilePath $pythonExe -ArgumentList @("-m", "ION_ai.world.run_server") -WorkingDirectory $repoRoot -PassThru -NoNewWindow
  Start-Sleep -Milliseconds 600

  if ($worldBridgeProcess.HasExited) {
    throw "ION sovereign world bridge exited immediately with code $($worldBridgeProcess.ExitCode)."
  }

  Write-Output "[ION-dev] Sovereign world bridge PID: $($worldBridgeProcess.Id)"
  Write-Output "[ION-dev] Starting Cloudflare worker (npx $($wranglerArgs -join ' '))..."

  Push-Location $repoRoot
  try {
    & npx @wranglerArgs
    if ($LASTEXITCODE -ne $null) {
      $workerExitCode = [int]$LASTEXITCODE
    }
  }
  finally {
    Pop-Location
  }
}
finally {
  if ($worldBridgeProcess -and -not $worldBridgeProcess.HasExited) {
    Write-Output "[ION-dev] Stopping sovereign world bridge (PID $($worldBridgeProcess.Id))..."
    Stop-Process -Id $worldBridgeProcess.Id -Force -ErrorAction SilentlyContinue
  }

  if ($mediaProcess -and -not $mediaProcess.HasExited) {
    Write-Output "[ION-dev] Stopping ION media service (PID $($mediaProcess.Id))..."
    Stop-Process -Id $mediaProcess.Id -Force -ErrorAction SilentlyContinue
  }
}

if ($workerExitCode -ne 0) {
  exit $workerExitCode
}
