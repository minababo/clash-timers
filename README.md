# clash-timers

[![CI](https://github.com/minababo/clash-timers/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/minababo/clash-timers/actions/workflows/ci.yml?query=branch%3Adev)

Operating and troubleshooting the app: see the [runbook](RUNBOOK.md).

## Continuous integration

GitHub Actions runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml) on every pull request
and on every push to `dev` and `main`. It installs dependencies with `npm ci` on the Node version in
[`.nvmrc`](.nvmrc), then runs each check as its own step, so a failure shows which one broke:

1. Lint: `npm run lint` (ESLint)
2. Check formatting: `npm run format:check` (Prettier)
3. Test: `npm run test` (Vitest, single run)
4. Build: `npm run build` (TypeScript check + production build)

A newer push to the same PR or branch cancels the run in progress.

To run the same checks locally, use the Node version from `.nvmrc` (`nvm use` picks it up), then:

```sh
npm ci
npm run lint
npm run format:check
npm run test
npm run build
```

If formatting fails, `npm run format` fixes it.

## Local checks (Windows)

Two PowerShell scripts in [`scripts/`](scripts/) work in Windows PowerShell 5.1 and PowerShell 7.
They can be run from any folder; they switch to the repo root and switch back afterwards.

### `scripts/check.ps1`: run the CI checks

Mirrors the CI steps, in the same order: lint (`npm run lint`), format check
(`npm run format:check`), tests (`npm run test`) and build (`npm run build`). It shows each step's
output, then prints a summary with PASS/FAIL/SKIPPED and the duration of each step.

Before running anything it checks that Node and npm are installed, that the Node major version
matches [`.nvmrc`](.nvmrc), and that `node_modules` exists (if not, run `npm ci`).

```powershell
npm run check
# or directly:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check.ps1
# stop at the first failing step (the rest are reported as SKIPPED):
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check.ps1 -FailFast
```

Without `-FailFast`, every step runs even if an earlier one fails, so one run shows everything that
needs fixing. `npm run check` takes no switches, so call the script directly to use `-FailFast`.

Exit codes:

- `0`: every step passed.
- `1`: at least one step failed, or a preflight check failed (missing Node or npm, wrong Node
  version, or no `node_modules`).

### `scripts/update-names.ps1`: regenerate upgrade names

Runs `npm run generate:names`, then uses git to compare
`src/lib/names/upgradeNames.generated.ts` with the committed version.

- It prints either "Names are up to date" or "Names changed:" with a `git diff --stat` of the file.
- If names changed, review the diff and commit the file.
- The generated file's date line changes on every run, so it is ignored when comparing. If the date
  is the only difference, the file is restored to the committed version.

To pick up new game content, update the data package first (`npm i -D clash-of-clans-data@latest`).

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/update-names.ps1
```

Exit codes:

- `0`: the names were generated, whether or not they changed.
- `1`: generation failed, or Node, npm, git or `node_modules` is missing.

### Why `-ExecutionPolicy Bypass`

Windows blocks unsigned PowerShell scripts by default. `-ExecutionPolicy Bypass` lifts that for this
one `powershell` process only; it doesn't change your system's execution policy. Run
`Get-Help scripts/check.ps1 -Full` (or `scripts/update-names.ps1`) for the built-in help.

## Deployment

Live: https://clash-timers.vercel.app

The app is deployed on Vercel through its Git integration. Merging into `main` deploys to
production, and every other branch and pull request gets its own preview deployment. The footer
shows the deployed commit (`Version <short SHA>`, with `(preview)` on preview builds). Release and
rollback steps are in [RUNBOOK.md](RUNBOOK.md#7-deployment-and-rollback).

## Run with Docker

Builds the site and serves it with nginx on port 8080. Needs Docker Desktop (or another Docker
engine) running.

```sh
docker compose up --build
```

Open http://localhost:8080. To stop and remove the container:

```sh
docker compose down
```

Saved villages are stored per address, so villages saved on the dev server (`localhost:5173`) won't
appear on `localhost:8080`. See [RUNBOOK.md](RUNBOOK.md#4-container) for health checks and logs.

## Credits

Game data (upgrade names) comes from
[clash-of-clans-data](https://github.com/chiefpansancolt/clash-of-clans-data) by Christopher Pezza,
used under the MIT License.

This content is not affiliated with, endorsed, sponsored, or specifically approved by Supercell and
Supercell is not responsible for it. For more information see Supercell's Fan Content Policy:
[www.supercell.com/fan-content-policy](https://www.supercell.com/fan-content-policy).
