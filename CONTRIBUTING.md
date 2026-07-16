# Contributing to Cairn

Thank you for contributing to Cairn.

## Before you start

1. Search existing issues and pull requests before opening a new one.
2. For major changes, open an issue first so maintainers can align on scope.
3. Keep changes focused and traceable to a clear problem statement.

## Development setup

1. Clone the repository:

   ```bash
   git clone https://github.com/QuinntyneBrown/Cairn.git
   cd Cairn
   ```

2. Create the schema and load sample data (needs SQL Server at `.\SQLEXPRESS`):

   ```bash
   cd backend
   dotnet run --project src/Cairn.Cli -- db seed --reset
   ```

3. Start backend:

   ```bash
   cd backend
   dotnet restore
   dotnet run --project src/Cairn.Api --urls http://localhost:5099
   ```

4. Start frontend in a second terminal:

   ```bash
   cd frontend
   npm ci
   npm run start
   ```

## Testing expectations

Run tests that cover your changes before opening a pull request:

```bash
dotnet test backend/Cairn.sln
cd frontend
npm run test
npm run e2e
```

If your change touches the client/server boundary, also run the live suite against the real
stack:

```bash
cd frontend
npm run e2e:live
```

## The API contract

Client models are bound to `frontend/e2e/fixtures/recorded-api-contract.json`, a recording of
the real API's actual traffic. **When a model and the recording disagree, the model is wrong.**

If you change a DTO or a request record deliberately, re-record rather than hand-editing:

```bash
cd backend
CAIRN_RECORD_CONTRACT=1 dotnet test --filter FullyQualifiedName~RequestContract
```

Then retarget the TypeScript models until `npm run test:contract` passes. Never rename an
expectation to match a model. See [docs/api-contract.md](docs/api-contract.md) for why.

## Pull request guidelines

1. Create a descriptive branch name.
2. Write clear commit messages in imperative mood.
3. Include a short summary of what changed and why.
4. Link the related issue when applicable.
5. Add screenshots or recordings for UI changes.
6. Keep pull requests reviewable and scoped.

## Code style

- Follow existing repository patterns and naming conventions.
- Prefer small, cohesive functions and explicit types.
- Avoid unrelated refactors in feature or bug-fix pull requests.
- Backend: file per type, controllers over minimal APIs, EF configuration inline in
  `OnModelCreating`.
- Frontend: **no single-file components** — separate `.ts`, `.html`, and `.scss`, always.
  Components use only tier-2 design tokens, never `--ft-*` directly.

## Verifying a guard

Several checks in this repository exist to fail — the contract tests, the contrast assertions,
the lazy-SignalR build guard. If you want to satisfy yourself one still works, **do it on a
scratch branch or against a doctored copy of the fixture.** Do not mutate a live DTO or model
to prove a point; someone else reading the tree in that window will believe it.

## Documentation

Update documentation when behavior, setup, interfaces, or workflows change.

## Code of conduct

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
