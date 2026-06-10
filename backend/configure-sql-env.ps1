<#
Configure the MySQL environment variables used by every Spring Boot service.

Run from the backend folder before starting services:
  .\configure-sql-env.ps1

To save these values for your Windows user account:
  .\configure-sql-env.ps1 -PersistUser
#>

param(
    [switch]$PersistUser
)

# Edit these three values for your local MySQL server.
$DbUrl = "jdbc:mysql://localhost:3306/do_an_lien_nganh?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh&characterEncoding=UTF-8"
$DbUsername = "root"
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
