# Security policy

## Reporting a vulnerability

Please do not report security vulnerabilities in public issues.

Use GitHub Security Advisories for this repository to submit a private vulnerability report. Include:

- A clear description of the issue
- Steps to reproduce
- Affected paths, versions, or commits
- Potential impact
- Suggested mitigation (if available)

Maintainers will review and triage reports as quickly as possible and coordinate remediation and disclosure with the reporter when appropriate.

## Supported versions

Security fixes are prioritized for the latest `main` branch state. Historical branches and forks may not receive coordinated patches.

## Security hygiene

- Never commit secrets, credentials, or tokens.
- Use least-privilege credentials and short-lived tokens in development and CI.
- Keep dependencies current and remove unused packages.

## Cairn-specific notes

Cairn is internet-facing by design: voting links must be clickable by leads. A few properties
are load-bearing, and changes near them deserve extra scrutiny. They are documented in
[docs/architecture.md](docs/architecture.md).

- **A magic link is not a session.** A vote-link JWT's `sub` is a real user id. The default
  authorization policy requires `scope=user`, so a bare `[Authorize]` rejects vote tokens and a
  forgotten attribute fails closed. If that policy is ever relaxed, every voting link silently
  becomes a full account session for that lead.
- **Link tokens are stored as SHA-256 hashes only.** The raw URL exists once, in the response
  that mints it. `GET .../vote-links` returns `url` as `null` by design, and the admin UI
  regenerates rather than recovering.
- **Unknown, expired, and revoked links return an identical `410`.** Distinguishing them would
  make the endpoint an oracle for probing which links existed. The reason is logged
  server-side only.
- **The public ballot never carries an admin's bearer token**, even when an admin opens a lead's
  link in their own browser. This is asserted against both a faked and a real backend.
- **No signing key ships with this repository.** A committed key is a published key: the issuer
  and audience are public too, so anyone with the source could mint an admin token against any
  instance running with it — and pointing a deployment at the Development environment is an
  ordinary mistake, not an exotic one. Development generates an ephemeral key per run; every
  other environment must supply `Jwt:SigningKey` via user-secrets or the environment and
  refuses to start without one. Never commit a real key.
- **Sign-in is throttled** per email. Admin passwords are the only gate on the authenticated
  surface.
