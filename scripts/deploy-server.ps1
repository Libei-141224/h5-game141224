[CmdletBinding()]
param(
  [string]$ServerHost = "8.155.148.132",
  [string]$ServerUser = "root",
  [Parameter(Mandatory = $true)]
  [string]$ServerPassword,
  [string]$Branch = "main",
  [string]$RepoUrl = "https://github.com/Libei-141224/h5-game141224.git",
  [string]$AppDir = "/opt/h5-game141224"
)

$ErrorActionPreference = "Stop"

function New-AskPassFile {
  param([string]$Password)
  $tmpFile = Join-Path $PWD ".tmp_askpass.cmd"
  Set-Content -Path $tmpFile -Encoding ASCII -Value "@echo off`r`necho $Password"
  return $tmpFile
}

function Invoke-SshScript {
  param(
    [string]$RemoteHost,
    [string]$User,
    [string]$AskPassFile,
    [string]$ScriptBody
  )

  $env:SSH_ASKPASS = $AskPassFile
  $env:SSH_ASKPASS_REQUIRE = "force"
  $env:DISPLAY = "codex"

  $clean = $ScriptBody.Replace("`r", "")
  $clean | & "C:\Windows\System32\OpenSSH\ssh.exe" `
    -o StrictHostKeyChecking=accept-new `
    -o ConnectTimeout=15 `
    "$User@$RemoteHost" "bash -s"
}

Write-Host "==> Deploy target: $ServerUser@$ServerHost"
Write-Host "==> Branch: $Branch"
Write-Host "==> AppDir: $AppDir"

$askPass = New-AskPassFile -Password $ServerPassword
try {
  $remoteScript = @'
set -e

APP_DIR='__APP_DIR__'
REPO_URL='__REPO_URL__'
BRANCH='__BRANCH__'

echo "==> System checks"
git --version
docker --version
docker compose version

mkdir -p $(dirname "$APP_DIR")

if [ -d "$APP_DIR/.git" ]; then
  echo "==> Update repository"
  git -C "$APP_DIR" fetch origin
else
  echo "==> Clone repository"
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

git -C "$APP_DIR" checkout "$BRANCH"
git -C "$APP_DIR" pull --ff-only origin "$BRANCH"

cd "$APP_DIR"
echo "==> Docker deploy"
docker compose -f deploy/docker-compose.prod.yml up -d --build

echo "==> Container status"
docker compose -f deploy/docker-compose.prod.yml ps

echo "==> Health check"
curl -fsS http://127.0.0.1:11019/healthz
echo
echo "==> Deployment completed"
'@
  $remoteScript = $remoteScript.Replace('__APP_DIR__', $AppDir).Replace('__REPO_URL__', $RepoUrl).Replace('__BRANCH__', $Branch)

  Invoke-SshScript -RemoteHost $ServerHost -User $ServerUser -AskPassFile $askPass -ScriptBody $remoteScript
}
finally {
  Remove-Item -Force $askPass -ErrorAction SilentlyContinue
}
