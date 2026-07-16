targetScope = 'resourceGroup'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('GitHub OIDC subject trusted to deploy. This must match the production environment subject for this repository.')
param githubOidcSubject string = 'repo:QuinntyneBrown@1749159/Cairn@1303035961:environment:production'

@description('SQL administrator login. The password is supplied separately as a secure deployment parameter.')
param sqlAdministratorLogin string = 'cairnadmin'

@secure()
@description('SQL administrator password. Generate a unique value during the one-time deployment.')
param sqlAdministratorPassword string

@secure()
@minLength(32)
@description('JWT signing key used by the production API. Generate a unique random value.')
param jwtSigningKey string

@allowed([
  'F1'
  'B1'
])
@description('F1 avoids App Service charges but can cold-start. Use B1 for Always On.')
param appServicePlanSku string = 'F1'

var suffix = uniqueString(subscription().subscriptionId, resourceGroup().id, 'cairn')
var appServicePlanName = 'cairn-plan-${suffix}'
var webAppName = 'cairn-app-${suffix}'
var sqlServerName = 'cairn-sql-${suffix}'
var databaseName = 'Cairn'
var deploymentIdentityName = 'cairn-github-${suffix}'
var appUrl = 'https://${webAppName}.azurewebsites.net'
var isFreePlan = appServicePlanSku == 'F1'
var websiteContributorRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'de139f84-1756-47ae-9be6-808fbbe84772'
)
var sqlConnectionString = 'Server=tcp:${sqlServerName}${environment().suffixes.sqlServerHostname},1433;Initial Catalog=${databaseName};Persist Security Info=False;User ID=${sqlAdministratorLogin};Password=${sqlAdministratorPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: {
    name: appServicePlanSku
    tier: isFreePlan ? 'Free' : 'Basic'
    size: appServicePlanSku
    capacity: 1
  }
  properties: {
    reserved: true
    zoneRedundant: false
  }
}

resource webApp 'Microsoft.Web/sites@2024-04-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    clientAffinityEnabled: true
    publicNetworkAccess: 'Enabled'
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|10.0'
      alwaysOn: !isFreePlan
      ftpsState: 'Disabled'
      http20Enabled: true
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      webSocketsEnabled: true
    }
  }
}

resource ftpPublishingPolicy 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-04-01' = {
  parent: webApp
  name: 'ftp'
  properties: {
    allow: false
  }
}

resource scmPublishingPolicy 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-04-01' = {
  parent: webApp
  name: 'scm'
  properties: {
    allow: false
  }
}

resource webAppSettings 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: webApp
  name: 'appsettings'
  properties: {
    ASPNETCORE_ENVIRONMENT: 'Production'
    Cors__AllowedOrigins__0: appUrl
    Jwt__Audience: appUrl
    Jwt__Issuer: appUrl
    Jwt__SigningKey: jwtSigningKey
    SCM_DO_BUILD_DURING_DEPLOYMENT: 'false'
    VoteLink__BaseUrl: appUrl
    WEBSITE_HTTPLOGGING_RETENTION_DAYS: '7'
  }
}

resource webAppConnectionStrings 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: webApp
  name: 'connectionstrings'
  properties: {
    Default: {
      type: 'SQLAzure'
      value: sqlConnectionString
    }
  }
}

resource webAppLogs 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: webApp
  name: 'logs'
  properties: {
    applicationLogs: {
      fileSystem: {
        level: 'Information'
      }
    }
    detailedErrorMessages: {
      enabled: false
    }
    failedRequestsTracing: {
      enabled: false
    }
    httpLogs: {
      fileSystem: {
        enabled: true
        retentionInDays: 3
        retentionInMb: 35
      }
    }
  }
}

resource sqlServer 'Microsoft.Sql/servers@2023-08-01' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: sqlAdministratorLogin
    administratorLoginPassword: sqlAdministratorPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    version: '12.0'
  }
}

resource allowAzureServices 'Microsoft.Sql/servers/firewallRules@2023-08-01' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource database 'Microsoft.Sql/servers/databases@2023-08-01' = {
  parent: sqlServer
  name: databaseName
  location: location
  sku: {
    name: 'GP_S_Gen5'
    tier: 'GeneralPurpose'
    family: 'Gen5'
    capacity: 2
  }
  properties: {
    autoPauseDelay: 60
    freeLimitExhaustionBehavior: 'AutoPause'
    licenseType: 'LicenseIncluded'
    maxSizeBytes: 34359738368
    minCapacity: json('0.5')
    readScale: 'Disabled'
    requestedBackupStorageRedundancy: 'Local'
    useFreeLimit: true
    zoneRedundant: false
  }
}

resource deploymentIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: deploymentIdentityName
  location: location
}

resource githubFederatedCredential 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2024-11-30' = {
  parent: deploymentIdentity
  name: 'github-production'
  properties: {
    audiences: [
      'api://AzureADTokenExchange'
    ]
    issuer: 'https://token.actions.githubusercontent.com'
    subject: githubOidcSubject
  }
}

resource deploymentRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(webApp.id, deploymentIdentity.id, websiteContributorRoleDefinitionId)
  scope: webApp
  properties: {
    principalId: deploymentIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: websiteContributorRoleDefinitionId
  }
}

output appUrl string = appUrl
output azureClientId string = deploymentIdentity.properties.clientId
output azureSubscriptionId string = subscription().subscriptionId
output azureTenantId string = subscription().tenantId
output databaseName string = database.name
output deploymentIdentityName string = deploymentIdentity.name
output sqlServerName string = sqlServer.name
output webAppName string = webApp.name
