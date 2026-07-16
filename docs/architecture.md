# Architecture

The parts of Cairn worth understanding before changing them. Each one exists because the
obvious alternative has a failure mode that is silent.

## A vote's shape is enforced by the database, not just by code

An idea configures what answer it expects — `YesNo`, `Options`, or `Scale` — and a vote must
match. `Vote` has three nullable value columns and a denormalised `ResponseType`, with a
composite foreign key onto `(Idea.Id, Idea.ResponseType)` and a check constraint tying the
populated column to the type.

A check constraint cannot reach across tables, which is why the type is copied onto the row.
That is the whole trick: ten lines of Fluent API make three bug classes impossible rather than
merely tested-against.

| Attempt | Rejected by |
| --- | --- |
| A scale value on a yes/no idea | `CK_Votes_ShapeMatchesResponseType` |
| A vote whose type drifted from its idea's | `FK_Votes_Ideas_IdeaId_ResponseType` |
| A vote for another idea's option | `FK_Votes_IdeaOptions_IdeaId_SelectedOptionId` |

Rejected alternatives: a **JSON column** kills `GROUP BY`/`AVG` tallying, which is the whole
feature, and cannot be a foreign-key target. **TPH inheritance** produces the same nullable
columns plus a discriminator that can silently disagree with the parent. **Owned types** are
the nullable columns again, with ceremony.

The option foreign key uses `Restrict` rather than `Cascade` because `Idea → Vote` and
`Idea → IdeaOption → Vote` would otherwise be multiple cascade paths, which SQL Server refuses
outright. The composite key on a nullable column works because SQL Server uses MATCH SIMPLE
semantics: when `SelectedOptionId` is null the constraint simply does not fire.

**Consequence:** changing an idea's response type once votes exist raises a foreign-key
violation. `UpdateIdeaCommandHandler` pre-empts that with a readable validation error, so the
constraint surfaces as a sentence rather than a 500.

## A magic-link token is not a session

`POST /api/vote-sessions` exchanges a raw link token for a short-lived JWT carrying
`scope=vote` and an `idea_id` claim. Its `sub` is a **real user id** — so if `scope` were not
checked, every voting link would silently become a full account session for that lead.

The default authorization policy requires `scope=user`:

```csharp
options.DefaultPolicy = new AuthorizationPolicyBuilder()
    .RequireAuthenticatedUser()
    .RequireClaim(AuthScopes.ClaimType, AuthScopes.User)
    .Build();
```

Every bare `[Authorize]` therefore rejects vote tokens automatically, and endpoints that
accept them must opt in via `VoteLink` or `UserOrVoteLink`. **Forgetting an attribute fails
closed, not open.** Handlers additionally check the `idea_id` claim against the idea being
acted on, or a link holder could act on any idea.

Accepted tradeoff: revoking a link cannot revoke an already-minted JWT until it expires (at
most an hour). The alternative is a denylist this app does not need.

## Closure is derived, never stored

`OpensAt <= now < ClosesAt` is recomputed on every read and every write. There is no status
column. `Idea.ClosedAnnouncedAt` is broadcast bookkeeping, not status.

This is what makes the real-time layer safe to be unreliable. A missed timer tick, a restart,
clock skew, or a client with a wrong clock all cost a few seconds of UI staleness — and none
of them can let a late vote through. The SignalR `VotingClosed` event is a courtesy; **the 409
on a late vote is the guarantee.**

`ClosedAnnouncedAt` being a column rather than memory is what makes announcement idempotent
across restarts: an idea that closed while the process was down is announced once on the next
tick after boot.

## Voters never see running tallies

The hub keeps two groups per idea: watchers get `VoteRecorded`, voters get closure and
comments only. Showing a lead the crowd's leaning anchors their answer, which corrupts the
thing being measured — and it lets a voter watch who is voting in real time.

The client mirrors this structurally rather than by convention. `voteRecorded$` exists only on
`IIdeaReportRealtime`, not on the `IVoteRealtime` the ballot injects, so the ballot **cannot
render a tally even by accident** — it does not compile. One implementation, two contracts,
two tokens, and deliberately not `useExisting` (which would land a voter in the report group).

## Only link hashes are stored

A vote link's raw token exists exactly once, in the response that mints it. Only a SHA-256
hash is persisted, so the server cannot reconstruct a URL — `GET .../vote-links` returns `url`
as `null`, always. Regenerating rotates the hash in place, which keeps `(IdeaId, UserId)`
unique and kills the previous URL immediately.

SHA-256 rather than BCrypt is deliberate: BCrypt exists to make brute-forcing low-entropy
human passwords slow, but a 256-bit random token has nothing to brute-force, and BCrypt's
per-row salt would force a table scan where this gets a single indexed seek. Passwords use
BCrypt; these do not.

Unknown, expired, and revoked links all return an **identical** `410 Gone` with an identical
body. Distinguishing them would turn the endpoint into an oracle for probing which links once
existed. The reason is recorded server-side only.

## The public ballot is isolated from the authenticated app

One Angular application, two surfaces. `vote/:token` sits outside the guarded shell, so
`authGuard` is never in its activation chain. `BallotService` passes an `HttpContextToken`
that makes the global auth interceptor bail on line one — not a URL-prefix check, which is
stringly-typed coupling that breaks silently on rename.

The bug this prevents is concrete: an admin opens a lead's link on their own phone. Without
the bail, the interceptor attaches the admin's bearer (the server may attribute the vote to
them), and a 401 on an expired link would clear the admin's session and bounce an anonymous
voter to a login page they cannot use.

The ballot's own scoped JWT is held **in memory** and never in `localStorage` under the
admin's key, for the same reason.

## Leads are users, not a separate table

A lead is a `User` with `Role = "Lead"`, usually with no password. One identity, one
`Vote.VoterId → User.Id`, and a lead can be given credentials later with no migration.

This creates one trap worth knowing: a passwordless lead has an empty `PasswordHash`, and
`BCrypt.Verify(password, "")` **throws** rather than returning false — which would surface as
a 500 where a wrong password gives 401, telling an attacker the account exists. Sign-in guards
for an empty hash before verifying.

## The CLI talks to the database, not the API

`Cairn.Cli` references Application and Infrastructure and dispatches the same MediatR handlers
in-process. Seeding over HTTP would mean bulk-write endpoints that exist only to be seeded
through, which must then be authorized and are a production liability. An admin tool that
fails because you forgot `dotnet run` in another terminal is a bad tool.

The connection string is the authority: if you can reach the database, you are the admin.

Every command opens a DI scope. `AppDbContext` — and therefore every handler — is scoped, so
resolving `IMediator` off the root provider would throw or root a DbContext for the life of
the process. `CliScope` exists so no command can forget.

## Client disconnects are not server errors

A caller closing a tab mid-request surfaces as a `TaskCanceledException` from whatever query
was in flight. Left to the catch-all, it logs at Error as "Unhandled exception" and answers
500. On an app whose critical page is opened on a phone on the subway, clients vanishing is
not an edge case.

The middleware catches `OperationCanceledException` **only when `RequestAborted` fired** —
that becomes a quiet 499. A cancellation from anywhere else is a real fault and still surfaces
as a 500. The distinction is the point, and it is pinned by tests.
