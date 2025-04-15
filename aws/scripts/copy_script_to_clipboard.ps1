# PowerShell script to copy the content of a setup script to clipboard
# Usage: .\copy_script_to_clipboard.ps1 -vm [database|frontend|backend|messaging]

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("database", "frontend", "backend", "messaging")]
    [string]$vm
)

$scriptPath = ""

switch ($vm) {
    "database" { $scriptPath = "setup_keys_database.sh" }
    "frontend" { $scriptPath = "setup_keys_frontend.sh" }
    "backend" { $scriptPath = "setup_keys_backend.sh" }
    "messaging" { $scriptPath = "setup_keys_messaging.sh" }
}

$fullPath = Join-Path -Path $PSScriptRoot -ChildPath $scriptPath

if (Test-Path $fullPath) {
    $content = Get-Content -Path $fullPath -Raw
    $content | Set-Clipboard
    Write-Host "Content of $scriptPath has been copied to clipboard."
    Write-Host "Paste it into the terminal of the $vm VM and run it."
} else {
    Write-Host "Error: Script file not found at $fullPath"
}
