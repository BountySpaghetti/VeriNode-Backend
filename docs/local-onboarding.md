# Local Developer Onboarding

Use `scripts/onboard-local-dev.sh` to prepare a workstation for VeriNode Backend development. The script is designed to be idempotent so contributors can re-run it after pulling changes without overwriting local configuration.

## What the script does

1. Verifies required tools are available (`git`, Node.js 18+ and the selected package manager).
2. Creates `config.json` from `config.json.example` when a local config does not already exist.
3. Installs dependencies with `npm ci` by default, or `pnpm install --frozen-lockfile` when `PACKAGE_MANAGER=pnpm` is set.
4. Builds the TypeScript project with `npm run build`.
5. Optionally runs the full test suite when `RUN_TESTS=1` is set.

## Usage

```bash
scripts/onboard-local-dev.sh
```

Run tests as part of setup:

```bash
RUN_TESTS=1 scripts/onboard-local-dev.sh
```

Use pnpm instead of npm:

```bash
PACKAGE_MANAGER=pnpm scripts/onboard-local-dev.sh
```

Force a dependency reinstall even when `node_modules` already exists:

```bash
ONBOARD_FORCE_INSTALL=1 scripts/onboard-local-dev.sh
```

## Operational notes

- The script never overwrites an existing `config.json`; update secrets and local endpoints manually.
- It fails fast on missing prerequisites so setup problems are visible before services are started.
- Keep onboarding changes low-risk and local-only; production deployment, blue-green rollout, canary analysis, and alerting changes remain in the service runbooks and infrastructure pipelines.
