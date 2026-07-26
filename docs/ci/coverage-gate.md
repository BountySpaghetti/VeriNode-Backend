# CI Coverage Gate Runbook

The `Coverage Gate` workflow enforces repository-wide code coverage on every pull request and on pushes to `main` and `develop`.

## Architecture

1. GitHub Actions checks out the repository and installs dependencies with `npm ci`.
2. `npm run test:coverage` executes the existing test suite under `c8` and writes `coverage/coverage-final.json`.
3. `npm run coverage:enforce` runs `scripts/coverage-enforce.js`, which computes overall and per-module statement coverage, writes `coverage/coverage-summary.json`, and fails the job when a configured threshold is missed.
4. Coverage artifacts are uploaded even on failure so maintainers can inspect the failing modules and uncovered files.

## Threshold policy

The default thresholds are defined in `scripts/coverage-enforce.js`:

- Overall statement coverage must meet `COVERAGE_OVERALL_MIN` when provided, otherwise the script default is used.
- Per-module thresholds are configured in `MODULE_THRESHOLDS`.
- `COVERAGE_REGRESSION_MAX_DROP_PCT` controls the optional baseline regression check when `BASELINE_JSON` is provided.

## Monitoring and alerting

Coverage failures surface as required GitHub checks. Branch protection should mark `Coverage Gate / Enforce code coverage thresholds` as required before merging to protected branches. The uploaded `coverage-report` artifact acts as the diagnostic dashboard for failed runs.

## Operations

- To reproduce locally, run `npm run ci`.
- To inspect the generated summary, open `coverage/coverage-summary.json` after a run.
- To compare against a saved baseline, run `BASELINE_JSON=path/to/baseline.json npm run coverage:enforce` after generating coverage.

## Rollout

Enable the workflow as a required check with normal branch protection. If the gate needs staged adoption, start by lowering only environment-provided thresholds in branch protection test branches, then ratchet the committed thresholds upward after coverage improvements land.
