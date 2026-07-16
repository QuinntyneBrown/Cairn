# CI/CD and Azure deployment

Cairn deploys the Angular SPA and ASP.NET Core API together to one Linux Azure App
Service. The API uses Azure SQL Database, and GitHub Actions authenticates to Azure with
OpenID Connect (OIDC); there is no publish profile or long-lived Azure credential in GitHub.

## Pipeline

The workflow is [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml).

| Trigger | Backend | Frontend | Package | Deploy |
| --- | --- | --- | --- | --- |
| Pull request to `main` | Build + SQL Server acceptance tests | Unit, contract, build, and Playwright tests | API + SPA artifact | No |
| Push to `main` | Build + SQL Server acceptance tests | Unit, contract, build, and Playwright tests | API + SPA artifact | Azure production |
| Manual run on `main` | Same gates | Same gates | Same artifact | Azure production |

The backend and frontend jobs run in parallel. Deployment starts only after both are green,
then polls `/health` (including an Azure SQL connectivity check), verifies the SPA root and a
client-side route, and confirms an unknown API route still returns 404.

All third-party actions are pinned to full commit SHAs. The deploy job receives only
`id-token: write` and `contents: read` permissions, and its Azure identity has Website
Contributor on the Cairn Web App only.

## One-time setup

Prerequisites:

- Azure CLI authenticated to the target subscription
- GitHub CLI authenticated with repository and Actions-variable access
- Bicep CLI (the Azure CLI can install it with `az bicep install`)

From the repository root, run:

```powershell
./infra/deploy.ps1
```

The script creates or updates `cairn-prod-rg` in Canada Central, deploys
[`infra/main.bicep`](../infra/main.bicep), creates the GitHub `production` environment with a
`main`-only deployment policy, and sets these non-secret repository variables:

- `AZURE_CLIENT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_TENANT_ID`
- `AZURE_WEBAPP_NAME`

The Bicep deployment creates:

- a Linux App Service plan and .NET 10 Web App;
- an Azure SQL logical server and `Cairn` database;
- a user-assigned managed identity with a GitHub environment federated credential; and
- an app-scoped Website Contributor role assignment for that deployment identity.

The default plan is App Service F1 and the SQL database uses Azure SQL's free-limit
serverless configuration with auto-pause. F1 has cold starts and no Always On. For a
production workload that needs consistent latency, provision B1 instead:

```powershell
./infra/deploy.ps1 -AppServicePlanSku B1
```

B1 incurs Azure charges. The template deliberately does not configure App Service's
continuous Health Check: `/health` probes SQL, so a platform probe every minute would prevent
the serverless database from auto-pausing. The post-deployment workflow probe remains enabled.

Runtime secrets are generated during setup and stored in App Service/Azure SQL, not GitHub or
the repository. Re-running `deploy.ps1` generates a new SQL administrator password and JWT
signing key, so existing sessions are invalidated.

## Bootstrap the first administrator

Migrations run automatically when the API starts, but production data is not seeded. Public
registration intentionally creates leads, never administrators. Create the first administrator
once from a trusted machine:

```powershell
$resourceGroup = 'cairn-prod-rg'
$webApp = gh variable get AZURE_WEBAPP_NAME --repo QuinntyneBrown/Cairn
$connection = az webapp config connection-string list `
  --resource-group $resourceGroup `
  --name $webApp `
  --query "[?name=='Default'].connectionString | [0]" `
  --output tsv

$env:CAIRN_ConnectionStrings__Default = $connection
dotnet run --project backend/src/Cairn.Cli -- `
  lead create --admin --name '<name>' --email '<email>' --password '<strong-password>'
Remove-Item Env:\CAIRN_ConnectionStrings__Default
```

Do not run `db seed` against production. It creates sample records and known development
credentials.

## Operations

View recent deployments:

```powershell
gh run list --workflow ci-cd.yml --limit 10
```

Stream application logs:

```powershell
$webApp = gh variable get AZURE_WEBAPP_NAME --repo QuinntyneBrown/Cairn
az webapp log tail --resource-group cairn-prod-rg --name $webApp
```

Trigger a recovery deployment from `main` without making a commit:

```powershell
gh workflow run ci-cd.yml --ref main
```
