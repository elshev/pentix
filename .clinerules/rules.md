# Project Rules

## Documentation

### The glossary and the decision index stay current

`GLOSSARY.md` is the only glossary. Add a term there when the code or a spec
adds one, and do not repeat the entries in `README.md`.

`docs/decisions/README.md` indexes every archived decision record. When
`openspec archive` moves a change into `openspec/changes/archive/`, add one row
to the index table with the date, the record link, the scope, and the status.
A status needs evidence in a later record. A guess is not a status.

### Agent skills stay identical across the four directories

A skill lives in `.cline/skills/<name>/`, `.codex/skills/<name>/`,
`.opencode/skills/<name>/`, and `.github/skills/<name>/`. Edit one copy, then
copy that directory over the other three. Only the Codex copy keeps
`agents/openai.yaml`. `docs/agent-skills.md` lists the source of every skill and
the local change in each port.

Refresh a ported skill with
`powershell -NoProfile -File scripts\update-agent-skill.ps1 -Name <skill>`, and
read the report before you add `-Apply`. Run this only when the user asks for it
in that session. Never run `-Apply` as part of another task, and never put the
script in CI or a git hook.

## Code style

### Count-valued names end with `Count`

A parameter, request/response field, or option that carries a count SHALL be
named `<thing>Count`, never a bare plural or a bare noun: `gameCount`, not
`games`; `completedGameCount`, not `gamesCompleted`; `MAX_DEMO_RUN_GAME_COUNT`,
not `MAX_DEMO_RUN_GAMES`. The suffix states the unit and keeps a count from
reading like a collection. A field that actually holds a collection keeps its
plural name.

## Keep the working branch in sync with `main`

Before making any code changes, confirm that the current branch contains the
latest changes from `main`, so the work is not built on top of stale code.

1. Fetch the latest refs:

   ```bash
   git fetch origin
   ```

2. Check whether `main` is fully contained in the current branch:

   ```bash
   git merge-base --is-ancestor origin/main HEAD
   ```

If the current branch does **not** contain the latest changes from `main`:

- **Warn** the user that the branch is behind `main`.
- **Stop** and do not make any changes.
- **Ask** whether the work should continue anyway, and wait for an explicit
  answer before proceeding.
