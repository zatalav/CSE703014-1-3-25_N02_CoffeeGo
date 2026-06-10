<#
Configure the Cloudinary environment variables used by content-service.

Run from the backend folder before starting content-service:
  .\configure-cloudinary-env.ps1

To save these values for your Windows user account:
  .\configure-cloudinary-env.ps1 -PersistUser
#>

param(
    [switch]$PersistUser
)

# Edit these values from your Cloudinary dashboard.
$CloudinaryCloudName = "Do_an_lien_nganh"
$CloudinaryApiKey = "549952216565839"
$CloudinaryApiSecret = "ifkro_fuwt3LHp9NzYJ-yAlJjos"
$CloudinaryFolder = "Do_an_lien_nganh"

$env:CLOUDINARY_CLOUD_NAME = $CloudinaryCloudName
$env:CLOUDINARY_API_KEY = $CloudinaryApiKey
$env:CLOUDINARY_API_SECRET = $CloudinaryApiSecret
$env:CLOUDINARY_FOLDER = $CloudinaryFolder

if ($PersistUser) {
    [Environment]::SetEnvironmentVariable("CLOUDINARY_CLOUD_NAME", $CloudinaryCloudName, "User")
    [Environment]::SetEnvironmentVariable("CLOUDINARY_API_KEY", $CloudinaryApiKey, "User")
    [Environment]::SetEnvironmentVariable("CLOUDINARY_API_SECRET", $CloudinaryApiSecret, "User")
    [Environment]::SetEnvironmentVariable("CLOUDINARY_FOLDER", $CloudinaryFolder, "User")
    Write-Host "Saved Cloudinary environment variables to the Windows user profile."
} else {
    Write-Host "Loaded Cloudinary environment variables for this PowerShell session."
}
