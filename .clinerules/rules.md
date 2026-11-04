# Project Rules

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
