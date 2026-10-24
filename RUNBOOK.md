# Runbook

How to run, check and troubleshoot Clash Timers.

## 1. Overview

Clash Timers turns a pasted Clash of Clans village export (JSON) into live upgrade countdowns, and
can save several villages and export running upgrades as calendar events.

- **Static frontend only.** A Vite + React build of HTML, CSS and JS. There is no backend, API or
  database.
- **All user data stays in the browser**, in `localStorage` under the key `clash-timers:v1`:

  ```json
  {
    "version": 1,
    "villages": [
      { "tag": "#G8QPYCL8Q", "nickname": "Main", "rawExport": "{...}", "savedAt": 1792269773000 }
    ]
  }
  ```

  `rawExport` is the pasted text exactly as it was pasted. It is parsed again on every load, and
  `savedAt` is epoch milliseconds. `nickname` is `null` when the village has no nickname.

- **Fallback:** if `localStorage` is unavailable or throws, the app keeps the data in memory
  instead. It works normally but is lost when the tab closes.

## 2. Quick reference

| Task                       | Command                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| Install dependencies       | `npm ci`                                                            |
| Dev server                 | `npm run dev`                                                       |
| Dev server for a phone     | `npm run dev -- --host`                                             |
| All CI checks (Windows)    | `npm run check`                                                     |
| Tests only                 | `npm run test`                                                      |
| Production build           | `npm run build` (output in `dist/`)                                 |
| Regenerate upgrade names   | `npm run generate:names`                                            |
| Regenerate and report diff | `powershell -ExecutionPolicy Bypass -File scripts/update-names.ps1` |
| Build and run in Docker    | `docker compose up --build` (then open http://localhost:8080)       |
| Stop the container         | `docker compose down`                                               |

| File                                       | What it is                                              |
| ------------------------------------------ | ------------------------------------------------------- |
| `.github/workflows/ci.yml`                 | CI pipeline                                             |
| `.nvmrc`                                   | Node major version (24), used by CI and `check.ps1`     |
| `scripts/check.ps1`                        | Runs the CI checks locally                              |
| `scripts/update-names.ps1`                 | Regenerates names and reports whether they changed      |
| `vercel.json`                              | Vercel response headers and `index.html` fallback       |
| `Dockerfile`                               | Image: Node build stage, unprivileged nginx serve stage |
| `docker/nginx.conf`                        | nginx config: `/healthz`, caching, headers, fallback    |
| `docker-compose.yml`                       | Local run: service `web` on port 8080                   |
| `.dockerignore`                            | Allowlist of files sent to the image build              |
| `src/lib/storage/villageStorage.ts`        | Storage key, data shape, memory fallback                |
| `src/lib/parser/parseVillageExport.ts`     | Export parser                                           |
| `src/lib/names/upgradeNames.generated.ts`  | Generated upgrade names (do not edit by hand)           |
| `src/lib/__fixtures__/village-export.json` | Real export used by tests (do not modify)               |

## 3. Running locally

1. Use the Node major version in `.nvmrc` (24): `nvm use 24` with nvm-windows, or `nvm use` with
   nvm on macOS/Linux.
2. Install: `npm ci`.
3. Start the dev server: `npm run dev`, then open the printed Local URL.
4. To test on a phone, run `npm run dev -- --host` and open the printed Network URL on the phone.
   The phone must be on the same Wi-Fi.

**Windows:** stop the dev server before running `npm ci`. A running dev server locks a native file
in `node_modules`, so `npm ci` fails with `EPERM` after it has already deleted most of
`node_modules`. Stop the server, then run `npm ci` again.

## 4. Container

The `Dockerfile` builds the site with Node, then serves `dist/` with unprivileged nginx. nginx runs
as user `nginx` (uid 101) and listens on port 8080. Docker Desktop must be running.

1. **Build and run:** `docker compose up --build -d` (leave out `-d` to stay attached). Open
   http://localhost:8080.
2. **Check health:**
   - `docker ps` shows `(healthy)` in the STATUS column after a few seconds.
   - `curl http://localhost:8080/healthz` returns `ok`.
   - The container checks `/healthz` itself every 30 seconds.
3. **View logs:** `docker compose logs web` (add `-f` to follow). `/healthz` requests aren't logged.
4. **Stop:** `docker compose down`.

Saved villages are per address, so villages saved on `localhost:5173` (the dev server) don't appear
on `localhost:8080`.

## 5. CI

**What and when:** `.github/workflows/ci.yml` runs on every pull request, and on every push to `dev`
and `main`. It has two jobs, which run in parallel.

**`docker`** builds the image with `docker/build-push-action`. It doesn't push the image anywhere,
and it caches layers in the GitHub Actions cache.

**`checks`** has these steps (the names shown in the Actions tab):

1. Check out code
2. Set up Node (version from `.nvmrc`, with the npm cache)
3. Install dependencies (`npm ci`)
4. Lint (`npm run lint`)
5. Check formatting (`npm run format:check`)
6. Test (`npm run test`)
7. Build (`npm run build`)

GitHub also adds its own "Set up job", "Post ..." and "Complete job" steps.

A newer push to the same PR or branch cancels the run in progress.

**Required status:** repository rulesets on `dev` and `main` require a pull request, and require the
`checks` status to pass before merging. The `docker` job runs on every PR too, but isn't required.

**Find the failing step:**

1. Open the PR's **Checks** tab, or the repo's **Actions** tab, then the failed **CI** run.
2. Open the `checks` job. The failed step has a red cross; expand it to see the log. Steps after
   it show as skipped.
3. From the terminal instead: `gh run list --workflow ci.yml`, then
   `gh run view <run-id> --log-failed`.

**Re-run:** in the run, choose **Re-run jobs** > **Re-run failed jobs**, or
`gh run rerun <run-id> --failed`. Re-running only helps for flaky failures; anything else needs a
new commit.

**Reproduce locally:** `npm run check` runs the same steps in the same order. Add `-FailFast` by
calling the script directly:
`powershell -ExecutionPolicy Bypass -File scripts/check.ps1 -FailFast`.

**Common causes:**

| Failing step               | Likely cause                                        | Fix                                                             |
| -------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| Check formatting           | A file isn't Prettier-formatted                     | `npm run format`, then commit                                   |
| Install dependencies       | `package-lock.json` out of sync with `package.json` | `npm install`, then commit `package-lock.json`                  |
| Any (only on your machine) | Local Node major differs from `.nvmrc`              | Switch Node versions. `npm run check` reports expected vs found |

## 6. Troubleshooting

### Timers are wrong or off

- **Likely cause:**
  - The export is stale.
  - A builder potion, book, hammer, Clock Tower or helper was used after exporting. Timers are fixed
    at export time.
  - The device clock or timezone is wrong.
- **Check:**
  - The village view shows "Exported X ago", and each card on the home screen shows "Updated X ago".
  - Compare the device clock with real time.
  - Finish times are shown in the device's timezone.
- **Fix:**
  1. Export again in game.
  2. Paste it with **Add or update village** (or **Update this village**).
  3. If the device clock or timezone is wrong, fix it in the device settings.

### An upgrade shows "Unknown <type> #<id>"

`<type>` is one of building, hero, troop, spell, siege machine, pet or item.

- **Likely cause:** new game content that isn't in the names data yet. Names come from the
  `clash-of-clans-data` package, generated into `src/lib/names/upgradeNames.generated.ts`.
- **Check:** search the generated file for the ID.
- **Fix:**
  1. `npm i -D clash-of-clans-data@latest`
  2. `powershell -ExecutionPolicy Bypass -File scripts/update-names.ps1`
  3. If it prints "Names changed:", review the diff, then commit the generated file together with
     `package.json` and `package-lock.json`.
  4. If the ID is still missing, the package doesn't have it yet. The fallback stays until it does.

### Villages missing after reload

- **Likely cause:**
  - A private or incognito window. Storage is either unavailable, so the memory fallback is used, or
    wiped when the window closes.
  - Site data was cleared.
  - A different browser, device or URL. Storage is per browser and per origin, so
    `localhost:5173` and a LAN IP address are separate.
  - The stored data is corrupt, which is read as empty.
- **Check:**
  1. Open DevTools (F12).
  2. Chrome or Edge: **Application** > **Local storage** > the site. Firefox: **Storage** >
     **Local Storage**.
  3. Look for the key `clash-timers:v1`, or run this in the console:
     `JSON.parse(localStorage.getItem('clash-timers:v1'))`.
     - No key: nothing is saved for this origin.
     - `JSON.parse` throws, or `version` isn't `1`: the data is corrupt or from another version.
- **Fix:**
  - Paste the export again.
  - If the data is corrupt, **back it up before pasting**: saving a village writes over corrupt data.
    In the console, `copy(localStorage.getItem('clash-timers:v1'))` copies it to the clipboard.
  - A saved village whose export no longer parses is hidden but stays in storage.

### "Paste from clipboard" doesn't work on iPhone

- **Likely cause:** reading the clipboard needs a secure context, i.e. HTTPS or `localhost`. The
  LAN dev server (`http://<ip>:5173`) is neither.
- **Check:** the app shows "Couldn't read your clipboard. Paste into the box above instead."
- **Fix:** paste into the text box manually: long-press, then **Paste**.

### Duplicate calendar events

- **Likely cause:** Add to Calendar was used more than once, or on more than one device. Each event's
  UID includes the upgrade's finish time, so a new export creates new events instead of updating the
  old ones.
- **Fix:** delete the old Clash Timers events in the calendar app, then add from one device only.
  The hint under the button says the same.
- A calendar subscription feed that would avoid this is planned, but not built yet.

### Parse error when loading a village

| Message shown                                                                                  | Meaning                                                                                                          |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| "That doesn't look like a village export. Copy it again from Clash and paste the whole thing." | The text isn't valid JSON. The paste is usually cut off or incomplete.                                           |
| "This is valid JSON but not a Clash village export."                                           | JSON, but without a string `tag` and a numeric `timestamp` at the top level. Usually the wrong thing was copied. |

A valid export with nothing upgrading loads without an error. Its summary says "Nothing is
upgrading in this export."

## 7. Deployment and rollback

Production URL: `<production URL>`

### How it works

- **Vercel Git integration.** Vercel builds the repo on its own; `vercel.json` only sets response
  headers and the fallback to `index.html`. Vercel detects Vite, so there's no build command in it.
- **Production is `main`.** Every merge to `main` creates a production deployment. To check or
  change the branch: **Project Settings > Environments > Production > Branch Tracking**.
- **Every other branch gets a preview.** Each push to any other branch, `dev` included, gets its
  own preview deployment. Merging into `dev` never touches production.
- **Version footer.** Each page shows `Version <short SHA>` at the bottom, with `(preview)` on
  preview deployments. The values come from Vercel's `VERCEL_GIT_COMMIT_SHA` and `VERCEL_ENV`.
  These are only available if **Project Settings > Environment Variables > "Enable access to System
  Environment Variables"** is ticked; otherwise the footer shows `Version local`. Local and Docker
  builds also show `local`.

### Release procedure

1. Open a PR from `dev` to `main` titled `release: <summary>`.
2. Wait for the `checks` status and the Vercel preview deployment. Open the preview and check that
   the footer says `(preview)`.
3. Merge the PR. Vercel builds and deploys `main` to production.
4. Verify the deploy (below).

### Verify a deploy

1. Open `<production URL>`.
2. Check the footer: `Version <SHA>` must match the merge commit on `main` (`git log -1 origin/main`),
   with no `(preview)`.
3. Paste an export and check that villages, names and countdowns work.
4. Check the caching headers, using the real file name from `index.html`:

   ```sh
   curl -sI <production URL>/ | grep -i cache-control
   curl -sI <production URL>/assets/<file>.js | grep -i cache-control
   ```

   Expect `no-cache` for `/`, and `public, max-age=31536000, immutable` for `/assets/`.

### Rollback

**a) Instant Rollback (fastest, in Vercel):**

1. On the project's overview page, click **Instant Rollback** on the Production Deployment tile.
   Alternatively, in **Deployments**, use the **⋮** menu on a production deployment.
2. Select the deployment to roll back to, click **Continue**, check the details, then click
   **Confirm Rollback**. The switch is immediate.

On the Hobby plan you can only roll back to the **immediately previous** production deployment.

After a rollback, Vercel **turns off auto-assignment of production domains**. New merges to `main`
still build, but they don't go live. To return to normal:

1. On the project overview, click **Undo Rollback** on the Production Deployment tile.
2. Select the deployment to promote, then click **Confirm**.

Promoting a deployment turns automatic production deploys back on.

**b) Revert on `main` (permanent fix):**

1. Create a branch from `main` and revert the bad change. For a merged PR, revert its merge commit:

   ```sh
   git fetch origin
   git checkout -b revert/<short-name> origin/main
   git revert -m 1 <merge commit SHA>
   git push -u origin revert/<short-name>
   ```

2. Open a PR into `main`, wait for `checks`, then merge. This deploys a new production build.
3. If you used Instant Rollback first, click **Undo Rollback** and promote the new deployment.
   Otherwise it doesn't go live.
4. Bring the revert into `dev` too (e.g. a PR from `main` into `dev`), so the next release doesn't
   bring the bad change back.

## 8. Monitoring and logs

- **What exists today:**
  - **Browser console** (DevTools). The app logs nothing on purpose, so this only shows browser and
    runtime errors.
  - **CI logs** in the GitHub Actions tab (see [CI](#5-ci)).
  - **Container logs** when running locally in Docker: `docker compose logs web` (see
    [Container](#4-container)).
- **Uptime monitoring and error reporting:** not set up yet. Added in the monitoring issue.

## 9. Incident notes

Postmortems will live in `docs/` (the folder doesn't exist yet).
