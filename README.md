# Cairn

Cairn is a voting tool for the FaithTech Toronto team, with an Angular frontend and an
ASP.NET Core backend. Team leads vote on ideas through unique expiring links that need no
login, and results land on a dashboard in real time over SignalR.

[![License: MIT](https://img.shields.io/badge/license-MIT-107C10.svg)](LICENSE)
[![CI/CD](https://github.com/QuinntyneBrown/Cairn/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/QuinntyneBrown/Cairn/actions/workflows/ci-cd.yml)
[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-0078D4.svg)](CONTRIBUTING.md)

[Documentation](#documentation) | [Contributing](CONTRIBUTING.md) | [Security](SECURITY.md) | [Support](SUPPORT.md)

## About the project

An admin posts an **idea** with an open/close window and a configured response shape. Each
lead gets a **unique expiring link** — no login, no account — opens it on their phone, votes,
and leaves a comment. Leads watch results land live on a dashboard. When the window closes,
voting locks everywhere at once.

An admin CLI seeds data, manages ideas, mints the links, and generates a FaithTech-branded
PowerPoint of the results for the next team night.

An idea expects one of three answers:

| Response type | What a lead sees |
| --- | --- |
| `YesNo` | Two large choices |
| `Options` | A custom set of choices |
| `Scale` | A 1–10 selector |

## Features

- Create ideas with an open/close window and a configured response shape
- Vote through a unique expiring link with no login and no account
- Watch tallies update live over SignalR, with voting locking the moment a window closes
- Leave and read comments against an idea
- Mint, list, and revoke per-lead voting links from the web app or the CLI
- Seed realistic sample data and manage ideas from a `System.CommandLine` admin CLI
- Generate a FaithTech-branded `.pptx` of results, built from the same projection the dashboard uses
- Run the real client against the real API with an opt-in live smoke suite

## Getting started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/10.0)
- SQL Server reachable at `.\SQLEXPRESS` ([Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) is enough)
- [Node.js](https://nodejs.org/) 20 or later
- npm 10 or later

### Local development

```bash
git clone https://github.com/QuinntyneBrown/Cairn.git
cd Cairn
```

Create the schema and load sample FaithTech Toronto data:

```bash
cd backend
dotnet run --project src/Cairn.Cli -- db seed --reset
```

Start backend (`http://localhost:5099`):

```bash
cd backend
dotnet restore
dotnet run --project src/Cairn.Api --urls http://localhost:5099
```

The API applies migrations on startup. **No signing key ships with this repository** — in
Development it generates an ephemeral one per run, so a fresh clone just works and tokens
simply do not survive a restart. Any other environment must supply `Jwt:SigningKey` (at least
32 characters) via user-secrets or the environment, and refuses to start otherwise.

Start frontend (`http://localhost:4205`) in a second terminal:

```bash
cd frontend
npm ci
npm run start
```

The dev server is **4205**, not Angular's default 4200. That is deliberate — see
`frontend/playwright.config.ts`. The API's `Cors:AllowedOrigins` and `VoteLink:BaseUrl` must
match it or generated links will 404.

Sign in as `admin@faithtech.to` / `cairn-admin-password` (seeded, development only), then mint
a link and open it in a private window:

```bash
cd backend
dotnet run --project src/Cairn.Cli -- idea list
dotnet run --project src/Cairn.Cli -- links generate --idea <id>
```

## Technology

| Area | Technologies |
| --- | --- |
| Frontend application | Angular 21, TypeScript, RxJS, signals, zoneless change detection |
| Frontend libraries | Custom `@cairn/api`, `@cairn/components`, and `@cairn/domain` packages |
| Backend | .NET 10, ASP.NET Core Web API, SignalR, MediatR 12.5.0, FluentValidation |
| Admin CLI | System.CommandLine 2.0.10, DocumentFormat.OpenXml 3.5.1 |
| Data layer | SQL Server via EF Core 10, code-first migrations |
| Authentication | JWT bearer with refresh rotation, BCrypt, scoped magic-link sessions |
| Testing | xunit, Microsoft.AspNetCore.Mvc.Testing, vitest, Playwright |

## Testing

Run backend tests (needs `.\SQLEXPRESS`):

```bash
dotnet test backend/Cairn.sln
```

Run frontend unit tests, the typecheck, and the API contract check:

```bash
cd frontend
npm run test
```

Run frontend e2e tests (backend faked):

```bash
cd frontend
npm run e2e
```

Run the live smoke suite against the real stack (opt-in; needs the API and database up):

```bash
cd frontend
npm run e2e:live
```

Backend acceptance tests run against a real throwaway SQL Server database, not SQLite or the
InMemory provider. The schema leans on composite foreign keys, a check constraint, and
`DateTimeOffset` comparison, and the substitutes either ignore those or cannot translate them —
so a test could pass on data the real database rejects.

## Project structure

```text
backend/                          .NET solution, API, admin CLI, and acceptance tests
backend/src/Cairn.Domain/         Entities only, zero dependencies
backend/src/Cairn.Application/    MediatR handlers, validators, DTOs, abstractions
backend/src/Cairn.Infrastructure/ EF Core, JWT, BCrypt, SignalR hub, seeding
backend/src/Cairn.Api/            Controllers, middleware, authorization policies
backend/src/Cairn.Cli/            `cairn` — the admin CLI and .pptx deck builder
backend/tests/Cairn.Acceptance/   xunit, including the API contract tests
frontend/                         Angular workspace and e2e suites
frontend/projects/cairn-app/      Main Angular application
frontend/projects/cairn/api/      Models, service contracts, HTTP and SignalR clients
frontend/projects/cairn/components/ Brand primitives with no Cairn knowledge
frontend/projects/cairn/domain/   Cairn-aware components
frontend/e2e/                     Playwright suites, fixtures, and the recorded API contract
docs/                             Architecture, contract discipline, branding, and CLI reference
```

## Documentation

| Document | Purpose |
| --- | --- |
| [Architecture](docs/architecture.md) | The parts worth understanding before changing them |
| [API contract](docs/api-contract.md) | Why the contract is recorded rather than authored, and how it is guarded |
| [Branding](docs/branding.md) | FaithTech design tokens, the contrast rule, and the font licensing item |
| [Admin CLI](docs/cli.md) | `cairn` command reference |
| [CI/CD and Azure deployment](docs/deployment.md) | Pipeline, infrastructure, production bootstrap, and operations |
| [Frontend workspace README](frontend/README.md) | Angular workspace commands |

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, workflow, and pull-request expectations. Participation is governed by the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Contributors are listed in [CONTRIBUTORS.md](CONTRIBUTORS.md), and notable repository changes are tracked in [CHANGELOG.md](CHANGELOG.md).

## Security

Please do not open public issues for security vulnerabilities. Follow [SECURITY.md](SECURITY.md) to report security concerns privately.

Cairn is internet-facing by design — voting links have to be clickable by leads — so the
security decisions are load-bearing rather than incidental. They are documented in
[docs/architecture.md](docs/architecture.md).

## Governance

Project roles and decision-making expectations are documented in [GOVERNANCE.md](GOVERNANCE.md).

## License

Copyright (c) 2026 Cairn contributors. Released under the [MIT License](LICENSE).
