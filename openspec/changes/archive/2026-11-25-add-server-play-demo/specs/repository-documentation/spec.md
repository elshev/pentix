## ADDED Requirements

### Requirement: The documentation describes the server demo batches

The repository documentation SHALL describe the server-side demo batches as a shipped capability: `POST /demo-runs` with its `gameCount` parameter (default `1`, maximum `256`), the background execution and retrievable status, the standings ordered winner to loser with name, points, lines, pieces, and planning time, and the fact that runs are in memory only, are not persisted, and have no browser UI. The documentation SHALL also describe the shared demo playback in `pentix-core` (seeded demo sessions, Action-then-Tick replay, plan-time measurement) and SHALL NOT present demo games as something that can only be watched in the browser.

#### Scenario: The Server API section lists the demo endpoints

- **GIVEN** a developer reading `README.md`
- **WHEN** they look up the server API
- **THEN** `POST /demo-runs` and `GET /demo-runs/{id}` are documented
- **AND** the `gameCount` default and maximum are stated
- **AND** the standings fields are named

#### Scenario: The shipped demo batches are not listed as missing

- **GIVEN** the "not implemented yet" section of the root documentation
- **WHEN** a developer reads it
- **THEN** server demo runs are not listed there
- **AND** the absence of a UI for them, their in-memory lifetime, and the missing browser-to-server connection are stated accurately

#### Scenario: The foundation notes explain the shared playback

- **GIVEN** a developer reading `docs/foundation.md`
- **WHEN** they look for how a demo is played without a browser
- **THEN** they find the shared playback module in `pentix-core`, its seeded session and Action-then-Tick rules, and the plan-time measurement
- **AND** they find the demo-run service in `apps/pentix-server` and its in-memory, non-persisted lifetime
