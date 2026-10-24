# clash-timers

[![CI](https://github.com/minababo/clash-timers/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/minababo/clash-timers/actions/workflows/ci.yml?query=branch%3Adev)

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

## Credits

Game data (upgrade names) comes from
[clash-of-clans-data](https://github.com/chiefpansancolt/clash-of-clans-data) by Christopher Pezza,
used under the MIT License.

This content is not affiliated with, endorsed, sponsored, or specifically approved by Supercell and
Supercell is not responsible for it. For more information see Supercell's Fan Content Policy:
[www.supercell.com/fan-content-policy](https://www.supercell.com/fan-content-policy).
