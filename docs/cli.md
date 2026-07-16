# `cairn` — the admin CLI

A `System.CommandLine` console app that seeds data, manages ideas, mints voting links, and
builds the results deck. It talks to the database directly rather than over HTTP — see
[architecture.md](architecture.md#the-cli-talks-to-the-database-not-the-api).

## Install as a local .NET tool

Pack the tool, then restore it through the repository's tool manifest:

```bash
cd backend
dotnet pack src/Cairn.Cli -c Release -o ../artifacts/packages
cd ..
dotnet tool restore --add-source artifacts/packages
dotnet cairn --help
```

The manifest pins the local command to `Cairn.Cli` 1.0.0. The package is not published to
NuGet.org, so a fresh checkout must be packed into `artifacts/packages` before restore.

For day-to-day source development, the project remains directly runnable:

```bash
cd backend
dotnet run --project src/Cairn.Cli -- <command>
```

## Commands

```
cairn
├─ config  show                    Resolved DB target and base URL (password masked)
├─ db      migrate                 Apply outstanding EF Core migrations
│          seed [--reset]          Seed FaithTech Toronto sample data
│          reset [--force]         Drop the database and recreate it empty
├─ lead    create --name --email [--admin --password]
│          list [--json]
├─ idea    create --title --description --response-type --choice --opens-at --closes-at
│          list [--status Draft|Open|Closed] [--json]
│          show <id>
│          close <id>              Move the close time to now
│          reopen <id> [--closes-at]
│          delete <id> [--force]
├─ links   generate --idea <id> [--lead <id>] [--format text|csv|md]
│          list --idea <id>
├─ results show --idea <id>
└─ deck    build [--idea <id>]... [--output] [--title] [--open]
```

## The ones worth knowing

**`config show`** prints the resolved connection string with the password masked. It is the
thing to check before `db reset`.

**`db reset` and `db seed --reset`** refuse to run against a non-local server unless you pass
`--force`. The connection string is the CLI's only authority, so nothing else stands between a
mistyped config and dropping the real database.

**`links generate`** is the primary distribution mechanism, since links are copied by hand
rather than emailed. With `--lead <id>` it prints the **bare URL and nothing else**, so it
composes with the shell:

```bash
cairn links generate --idea <id> --lead <id> | clip
```

`--format csv` for a mail merge, `--format md` for pasting into Slack or Notion.

Regenerating **rotates the link in place** — the previously shared URL stops working
immediately. Only hashes are stored, so `links list` can show who has a link and who has
voted, but never the URL itself.

**`idea close`** is not a state transition. There is no status column: it moves `ClosesAt` to
now, and every read derives "closed" from the clock. The API's hosted service notices within
30 seconds and tells connected clients; late votes are already refused regardless.

**`results show`** renders the same projection the deck does, in a terminal. It exists so the
aggregation can be checked where feedback is instant, rather than by opening PowerPoint.

```
How ready are we to host a regional gathering?
----------------------------------------------
Open · 6 of 8 invited voted (75%)

 5  ████████████████████████████████  2
 6  ████████████████················  1
 7  ████████████████████████████████  2
 9  ████████████████················  1

Average: 6.50 / 10
```

**`deck build`** generates a real FaithTech-branded `.pptx`. The slide master, layout and
theme are built in code, so the palette lives in source and no binary template is checked in.
Slides are added from the layout rather than cloned — cloning means deep-copying parts and
remapping relationship ids, which is the classic OpenXML tarpit.

Visuals are native rounded-rectangle shapes, not chart parts. That is not a shortcut: a real
`ChartPart` needs an embedded spreadsheet part and then a fight with PowerPoint's chart style
engine to strip the gradients, shadows and gridlines FaithTech's flat aesthetic forbids. Flat
fills are less work *and* land closer to the brand.

Defaults to every closed idea; pass `--idea` to include one that is still open.

## Adding a command

One command per file under `Commands/`, plus one `.Add()` line in its group. Every action must
open a DI scope via `CliScope` — `AppDbContext` and every MediatR handler are scoped, and
resolving `IMediator` off the root provider would throw or root a DbContext for the life of
the process.

Commands send the same MediatR messages the HTTP API sends, so validation and invariants are
shared rather than reimplemented.
