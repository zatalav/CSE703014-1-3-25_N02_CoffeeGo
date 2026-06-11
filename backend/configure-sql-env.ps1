<#
Configure the PostgreSQL environment variables used by every Spring Boot service.

Run from the backend folder before starting services:
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\configure-sql-env.ps1

To save these values for your Windows user account:
  powershell -ExecutionPolicy Bypass -File .\configure-sql-env.ps1 -PersistUser
#>

param(
    [switch]$PersistUser
)

# Edit these three values for your local PostgreSQL server.
$DbUrl = "jdbc:postgresql://localhost:5432/do_an_lien_nganh"
$DbUsername = "postgres"
$DbPassword = "CSDL2021"

$env:DB_URL = $DbUrl
$env:DB_USERNAME = $DbUsername
$env:DB_PASSWORD = $DbPassword

if ($PersistUser) {
    [Environment]::SetEnvironmentVariable("DB_URL", $DbUrl, "User")
    [Environment]::SetEnvironmentVariable("DB_USERNAME", $DbUsername, "User")
    [Environment]::SetEnvironmentVariable("DB_PASSWORD", $DbPassword, "User")
    Write-Host "Saved DB_URL, DB_USERNAME, and DB_PASSWORD to Windows user environment variables."
} else {
    Write-Host "Loaded DB_URL, DB_USERNAME, and DB_PASSWORD for this PowerShell session."
}
