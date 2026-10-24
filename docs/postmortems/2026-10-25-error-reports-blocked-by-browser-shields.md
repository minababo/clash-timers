# Postmortem: error reports blocked by browser privacy shields

- **Date:** 2026-10-25
- **Status:** Final
- **Related:** issue #38, PR #28 (monitoring), PR #29 (release to production), issue #27

## Summary

While the new Sentry error reporting was being verified on PR #28's preview deployment, a test
error never reached Sentry. The browser's privacy shields (Brave Shields) blocked the request to
Sentry's ingest host, as they do by default. The fix, made in the same PR before release, was to
send reports to a same-origin path (`/monitoring`), which a small Vercel Function forwards to
Sentry. A test error from the preview then arrived with shields on.

## Impact

- **No production users were affected.** Monitoring had not been released yet. It reached
  production (`main`) through PR #29 at 01:55 on 2026-10-25, with the fix already included.
- **What it would have meant in production:** errors from anyone using Brave, or an ad blocker
  that blocks Sentry, would have been silently lost. Sentry would have looked healthy, because
  missing reports don't show up anywhere.
- **IP-based location:** the one event that arrived before the fix showed the tester's city in
  Sentry. Sentry derives it from the sender's IP address on its side. This affected only that
  test event.

## Detection

Detected by a manual step in PR #28's test plan: "Send test error" on the preview, then check
Sentry. Nothing automated would have noticed. It was detected about 10 minutes after the first
attempt, and before release.

## Timeline

All times in Asia/Colombo (UTC+05:30), with UTC where the time comes from GitHub or Sentry.

| Time (UTC+05:30)             | Event                                                                                                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-24 23:40 (18:10 UTC) | Sentry project `clash-timers` created (Sentry audit log).                                                                                                                                                               |
| 23:46 (18:16 UTC)            | Sentry auth token `vercel-sourcemaps` created, for source map uploads (Sentry audit log).                                                                                                                               |
| ~23:54                       | Sentry environment variables added in Vercel.                                                                                                                                                                           |
| 2026-10-25 00:05 (18:35 UTC) | Commit `8d45f1f` adds Sentry error reporting; PR #28 opened at 00:06.                                                                                                                                                   |
| ~00:10                       | "Send test error" clicked on the PR #28 preview (release `8d45f1f`). No issue appears in Sentry; only Sentry's own sample event is in the feed.                                                                         |
| 00:10 to 00:19               | DevTools Network shows the POST to `*.ingest.us.sentry.io` failing with `net::ERR_BLOCKED_BY_CLIENT`. Cause: Brave Shields.                                                                                             |
| 00:19 (18:49:38 UTC)         | With Brave Shields turned off for the preview site, the test error arrives: issue CLASH-TIMERS-2, environment `preview`, release `8d45f1f`, readable stack trace pointing at `VersionFooter.tsx`.                       |
| 00:37 (19:07:20 UTC)         | Commit `510e1cc` adds the same-origin tunnel to PR #28.                                                                                                                                                                 |
| 00:37 (19:07:58 UTC)         | Test error from the `510e1cc` preview with Brave Shields **on** arrives through the tunnel (`POST /monitoring` returns 200): event in CLASH-TIMERS-2, release `510e1cc`. A second test follows at 00:38 (19:08:39 UTC). |
| Not recorded (after 00:19)   | While reviewing the first event, "Prevent Storing of IP Addresses" turned on in the Sentry project settings. The Sentry audit log has no entry for this change.                                                         |
| 01:51 (20:21:48 UTC)         | PR #28 merged into `dev`.                                                                                                                                                                                               |
| 01:55 (20:25:20 UTC)         | PR #29 (`release: monitoring`) merged into `main`; monitoring reaches production with the tunnel.                                                                                                                       |

## Root cause

**Direct cause:** the browser SDK sent reports straight to `*.ingest.sentry.io`. Brave Shields
blocked those requests in the browser, so they never left the page.

**Why the system allowed it:**

- **The design depended on a blocked domain.** Reports went to a well-known third-party telemetry
  domain. Privacy tools block such domains by design, so this wasn't a rare edge case: it's the
  expected behaviour of a common browser and of many ad blockers.
- **Earlier checks couldn't hit the block.** Before the preview test, the setup was checked in
  unit tests (with Sentry mocked) and in an automated browser run. That run intercepted requests
  to the ingest host inside the browser and answered them itself, so it confirmed what would be
  sent but never exercised the real network path where shields act.
- **The test plan didn't name the browser setup.** It didn't say to test with privacy protections
  on, so whether the problem showed up depended on which browser the tester happened to use.
- **The empty feed looked plausible.** Sentry's sample event made the project appear to be
  receiving data, which made an empty result easier to misread.

**The IP finding** has a separate cause. The SDK was configured to send no user or IP data, but
Sentry can still derive location from the IP address of the connection itself. That is
controlled by a Sentry project setting, not by code in this repo.

## Resolution

- **Tunnel (`510e1cc`, PR #28):**
  - The SDK option `tunnel: '/monitoring'` (`src/lib/monitoring/monitoring.ts`) makes the browser
    send reports to the app's own origin.
  - `vercel.json` rewrites `/monitoring` to the Vercel Function `api/monitoring.ts`.
  - The function uses `src/lib/monitoring/tunnel.ts` to forward an envelope only if its DSN
    matches the configured `VITE_SENTRY_DSN`. It forwards only to that DSN's ingest URL, and
    passes on neither the visitor's IP nor their headers.
  - Unit tests cover the forwarding rules and the `vercel.json` rewrite.
- **Verification:** a test error from the preview with Brave Shields on reached Sentry, with
  `POST /monitoring` returning 200.
- **IP addresses:** "Prevent Storing of IP Addresses" turned on in the Sentry project settings.

## What went well

- The manual verification step in the PR test plan caught the problem before release.
- DevTools showed the cause directly (`ERR_BLOCKED_BY_CLIENT`), so diagnosis took minutes.
- The fix went into the same PR, so production never ran the broken version.
- The event that did arrive contained no export data or player tag, confirming the scrubbing
  worked. The stack trace was readable, confirming the source map upload worked.
- The tunnel was built not to be an open relay: it checks the DSN and has a fixed destination.

## What went poorly

- Detection relied on a manual step and on the tester's browser happening to block Sentry.
- The pre-merge automated browser check intercepted requests before they reached the network, so
  it couldn't detect blocking.
- The runbook's "check that reporting works" step didn't say which browser settings to use.
- Not storing IP addresses depended on a setting outside the repo, and it was only noticed when
  reviewing the event.

## Action items

| Action                                                                                                                                       | Status | Link                             |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------- |
| Route Sentry reports through a same-origin tunnel (`/monitoring` to `api/monitoring.ts`)                                                     | Done   | PR #28 (commit `510e1cc`)        |
| Turn on "Prevent Storing of IP Addresses" in the Sentry project                                                                              | Done   | Sentry project settings          |
| RUNBOOK: check that reporting works with privacy shields or an ad blocker on, and that reports go to `/monitoring`                           | Done   | Issue #38 (this postmortem's PR) |
| Document the "Prevent Storing of IP Addresses" setting in RUNBOOK, since it lives outside the repo and a new Sentry project wouldn't have it | Open   |                                  |

## Lessons

- Test third-party integrations in a real browser with the privacy protections people actually
  use, not only with requests mocked or intercepted.
- Telemetry sent to a well-known third-party domain should be expected to be blocked for part of
  the audience. Same-origin endpoints avoid that.
- An empty or near-empty dashboard isn't proof that reporting works; send a known test event and
  find it.
- Privacy guarantees can depend on vendor-side settings as well as code. Write those settings
  down where the code is.
