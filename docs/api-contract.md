# The API contract

Why Cairn's client/server contract is **recorded** rather than authored, and how it is guarded
from both sides.

## What went wrong

The Angular client was once written against an *imagined* backend contract and shipped green.
`IdeaResults` had invented fields. `Lead` had an `organisation` the server has never heard of.
`VotingLink` had a `token` the server never sends — implying clients could reconstruct URLs,
which contradicts the whole hash-only design. `UpdateIdeaRequest` omitted `responseType` and
`options`, so every save would have silently converted an Options idea to YesNo and **deleted
its choices**.

It passed because **every test faked the side it was checking**. The service specs asserted a
hand-written body against a hand-written model: two fictions agreeing with each other. No
amount of that kind of testing can find this — not because the tests were bad, but because
they were *incapable of contradicting the belief they encoded*.

The failure was never a wrong belief about the contract. Beliefs are cheap to fix.

## The fix: one artifact, bound from both ends

```
frontend/e2e/fixtures/recorded-api-contract.json     <- the real API's actual traffic
   ^                                    ^
   |  ApiContractTests (C#)             |  api-contract.spec.ts (TS)
   |  server drift fails `dotnet test`  |  model drift fails `npm test`
```

The recording is **captured, never authored**:

- **Responses** by calling the running API against a seeded database.
- **Request bodies** by serialising the real C# request records through the API's own
  `JsonSerializerOptions`.

Nothing in it is typed by hand, because a hand-typed expectation is just another fake. It is
the one artifact nobody on either side authored.

## How the TypeScript side binds

Each model declares a compile-checked key set whose expected keys are read *from the
recording*:

```ts
const LEAD_KEYS: Record<keyof Lead, true> = {
  id: true, email: true, displayName: true, role: true, canSignIn: true,
};
expect(Object.keys(LEAD_KEYS).sort()).toEqual(recordedKeys('GET /api/leads -> 200'));
```

That fails two ways:

- **Compile** — a model that gains or loses a field no longer satisfies `Record<keyof T, true>`.
- **Runtime** — a key set that disagrees with recorded reality fails the assertion.

`npm run test:contract` runs `tsc --noEmit` **before** vitest, and that ordering is
load-bearing. **vitest strips types via esbuild without checking them**, so the compile half
would otherwise be silently inert: a guard that guards nothing. The same is true of every
spec in the repo, which is why `npm test` runs a `typecheck` script first — before it existed,
every `@ts-expect-error` in every spec was decorative.

Endpoints with no client counterpart (`RegisterRequest`, `RefreshRequest`) are listed as
`UNBOUND_BY_DESIGN` rather than given invented models. A model that exists only to satisfy a
checker is the original bug with better paperwork. A coverage check fails if a recorded
endpoint is neither bound nor explicitly waived.

## Changing the contract deliberately

```bash
cd backend
CAIRN_RECORD_CONTRACT=1 dotnet test --filter FullyQualifiedName~RequestContract
```

Then retarget the models until `npm run test:contract` passes. The regeneration merges into
the existing file, preserving every response entry.

**Re-record; never hand-edit the JSON, and never rename an expectation to match a model.**
When the two disagree, the recording is right and the model is wrong — that is not a
judgement call, and deleting an invented field is a revert to reality rather than a change.

## Verifying the guards can fail

A green guard proves nothing until you have watched it go red. Do that on a **scratch branch,
or against a doctored copy of the JSON** — never by mutating a live DTO.

That was tried here. A `[JsonPropertyName("identifier")]` was added to `CurrentUserDto` for
about ninety seconds to prove the contract test could fail. In that window another contributor
read the broken shape, was told by their tooling that the change was intentional, re-recorded
the contract to match, and wrote a mapping layer for a field that had already ceased to exist
— which would have made `CurrentUser.id` `undefined` for every admin, silently.

The guard caught it from both directions and nothing shipped. The churn was still real.

## What is deliberately preserved

Sign-in returns `userId`; `GET /api/me` returns `id`. Different DTOs for different endpoints.
The contract pins both rather than papering over them, and `AuthStateService` reconciles them
in exactly one place.

## The live suite

`npm run e2e:live` drives the real Angular app against the real .NET API — real SQL Server,
real JWTs, real minted links. It is opt-in and excluded from the default Playwright run,
because the default gate must stay hermetic (`npm test` passes with no API running at all).

It is the only place nothing is faked. Notably, the isolation invariant — *a signed-in admin
opening a lead's link sends no `Authorization` header* — was previously only ever proven
against a fake backend that could not have read the token anyway. It now runs against a server
that would happily accept one.

When the stack is not up, the suite **skips loudly** with the commands to start it. Its first
version printed `5 skipped, exit 0` and nothing else — indistinguishable from success at a
glance, which is the same green-that-means-nothing this whole discipline exists to prevent,
reproduced inside the guard built to prevent it.
