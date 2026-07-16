[CmdletBinding()]
param(
    [string] $ResourceGroup = 'cairn-prod-rg',
    [string] $Location = 'canadacentral',
    [string] $Repository = 'QuinntyneBrown/Cairn',
    [ValidateSet('F1', 'B1')]
    [string] $AppServicePlanSku = 'F1'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-LastExitCode {
    param([string] $Operation)

    if ($LASTEXITCODE -ne 0) {
        throw "$Operation failed with exit code $LASTEXITCODE."
    }
}

function New-RandomSecret {
    param([int] $ByteCount)

    $bytes = [byte[]]::new($ByteCount)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    [Convert]::ToBase64String($bytes)
}

# Prefixing the random material guarantees all four SQL password character classes.
$sqlAdministratorPassword = 'Ca1!' + (New-RandomSecret -ByteCount 30)
$jwtSigningKey = New-RandomSecret -ByteCount 48
$templateFile = Join-Path $PSScriptRoot 'main.bicep'

$accountJson = az account show --output json
Assert-LastExitCode 'Azure authentication check'
$account = $accountJson | ConvertFrom-Json

gh auth status *> $null
Assert-LastExitCode 'GitHub authentication check'

Write-Host "Creating or updating $ResourceGroup in $Location..."
az group create --name $ResourceGroup --location $Location --output none
Assert-LastExitCode 'Resource group deployment'

$deploymentJson = az deployment group create `
    --name 'cairn-foundation' `
    --resource-group $ResourceGroup `
    --template-file $templateFile `
    --parameters `
        "appServicePlanSku=$AppServicePlanSku" `
        "jwtSigningKey=$jwtSigningKey" `
        "sqlAdministratorPassword=$sqlAdministratorPassword" `
    --query properties.outputs `
    --output json
Assert-LastExitCode 'Azure resource deployment'

$outputs = $deploymentJson | ConvertFrom-Json

$variables = [ordered]@{
    AZURE_CLIENT_ID       = $outputs.azureClientId.value
    AZURE_SUBSCRIPTION_ID = $outputs.azureSubscriptionId.value
    AZURE_TENANT_ID       = $outputs.azureTenantId.value
    AZURE_WEBAPP_NAME     = $outputs.webAppName.value
}

foreach ($entry in $variables.GetEnumerator()) {
    gh variable set $entry.Key --repo $Repository --body $entry.Value
    Assert-LastExitCode "Setting GitHub variable $($entry.Key)"
}

# The deploy job uses this environment, so the environment name is part of its OIDC subject.
$environmentConfiguration = @{
    wait_timer = 0
    prevent_self_review = $false
    reviewers = @()
    deployment_branch_policy = @{
        protected_branches = $false
        custom_branch_policies = $true
    }
} | ConvertTo-Json -Depth 4 -Compress

$environmentConfiguration | gh api `
    --method PUT `
    "repos/$Repository/environments/production" `
    --input - *> $null
Assert-LastExitCode 'Creating the GitHub production environment'

$policiesJson = gh api "repos/$Repository/environments/production/deployment-branch-policies"
Assert-LastExitCode 'Reading production deployment branch policies'
$policies = ($policiesJson | ConvertFrom-Json).branch_policies

if (-not ($policies | Where-Object { $_.name -eq 'main' -and $_.type -eq 'branch' })) {
    gh api `
        --method POST `
        "repos/$Repository/environments/production/deployment-branch-policies" `
        --field name='main' `
        --field type='branch' *> $null
    Assert-LastExitCode 'Restricting production deployments to main'
}

Write-Host ''
Write-Host 'Azure and GitHub deployment configuration is ready.'
Write-Host "Application: $($outputs.appUrl.value)"
Write-Host "Web App:    $($outputs.webAppName.value)"
Write-Host "SQL Server: $($outputs.sqlServerName.value)"
Write-Host "Database:   $($outputs.databaseName.value)"
Write-Host "Identity:   $($outputs.deploymentIdentityName.value)"
Write-Host "Subscription: $($account.name)"
