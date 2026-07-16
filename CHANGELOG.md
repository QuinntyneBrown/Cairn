# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) where practical.

## [Unreleased]

### Added

- Initial Cairn implementation: .NET 10 clean-architecture backend, Angular 21 frontend, and the `cairn` admin CLI.
- Ideas with configurable response shapes (`YesNo`, `Options`, `Scale`) and an open/close window derived from the clock.
- Magic-link voting: unique expiring per-lead links requiring no login, redeemed for a short-lived idea-scoped JWT.
- Real-time vote reporting and closure notification over SignalR, with voters deliberately excluded from live tallies.
- Comments on ideas from both the admin surface and the public ballot.
- FaithTech-branded UI on design tokens extracted from FaithTech's live stylesheet, with Toronto's `#FFF737` as the accent.
- Admin CLI with seeding, idea CRUD, voting-link generation, terminal results, and FaithTech-branded `.pptx` deck generation.
- Recorded API contract (`frontend/e2e/fixtures/recorded-api-contract.json`) bound from both ends: C# acceptance tests assert the API still produces it, and TypeScript contract checks assert the models match it.
- Opt-in live smoke suite (`npm run e2e:live`) driving the real client against the real API.
- Build guard keeping `@microsoft/signalr` off the eager bundle.
- Root open-source project documentation set, including README, governance, contribution, security, support, and community files.
