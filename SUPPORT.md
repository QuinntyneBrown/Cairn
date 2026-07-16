# Support

## Getting help

For usage questions, setup problems, and non-security bugs:

1. Check [README.md](README.md) and existing documentation first.
2. Search existing GitHub issues.
3. Open a new issue with reproduction details if no existing issue matches.

## What to include in support requests

- Environment details (OS, .NET and Node versions, SQL Server edition, browser if relevant)
- Exact commands run
- Expected behavior
- Actual behavior
- Logs, screenshots, or stack traces

## Common setup problems

- **The API will not start outside Development.** No signing key ships with the repository, so
  any other environment must supply `Jwt:SigningKey` (at least 32 characters) via user-secrets
  or the environment. Development generates an ephemeral one per run.
- **Generated links 404.** The dev server is `:4205`, not Angular's default `:4200`. The API's
  `Cors:AllowedOrigins` and `VoteLink:BaseUrl` must match it. Run
  `dotnet run --project src/Cairn.Cli -- config show` to see what the CLI resolved.
- **Sign-in returns 429.** Sign-in is throttled after repeated failures, on a 15-minute
  window. It is working as intended.
- **`ng build @cairn/domain` fails with "cannot find module `@cairn/api`".** The libraries have
  a build order. Use `npm run build:libs`.
- **`npm run e2e:live` skips everything.** It needs the real API and database up; the skip
  message names the commands to start them.

## Security issues

Do not report security concerns in public issues. Follow [SECURITY.md](SECURITY.md).
