# Pre-Commit Hook Suite

VeriNode ships a repository-local pre-commit hook suite to catch quality and security issues before code leaves a developer machine.

## Architecture

The hook entrypoint is `scripts/pre-commit-hook`. It resolves the repository root and delegates all checks to `scripts/pre-commit-checks.cjs`, which keeps critical-path work fast by scanning only staged files by default.

Default staged-file checks include:

- large-file rejection for files over 5 MiB;
- merge-conflict marker detection;
- common secret keyword detection for staged text files;
- debug statement detection (`console.log`, `debugger`, Rust `println!`, Rust `dbg!`, and `todo!`);
- trailing-whitespace detection.

Set `VERINODE_PRECOMMIT_FULL=1` to add the TypeScript build and the full test suite to a commit attempt. This preserves a sub-100ms target for normal staged-file scans while supporting stronger local verification before high-risk changes.

## Installation

Run:

```sh
./install-hooks.sh
```

The installer copies `scripts/pre-commit-hook` to `.git/hooks/pre-commit` and makes it executable.

## Operations and runbook

1. If a commit is blocked, read the file-specific failure list printed by the hook.
2. Fix the flagged file and restage it.
3. Use `VERINODE_PRECOMMIT_FULL=1 git commit` before changes that affect critical paths, security-sensitive code, or deployment logic.
4. Only use `SKIP_PRECOMMIT=1 git commit` for emergency break-glass commits, and document the reason in the pull request.

## Monitoring and rollout

Pre-commit hooks run locally and do not affect production availability. Roll out by installing the hook on developer workstations and CI images. CI should continue to run build, test, and security jobs independently so failures remain visible even when a local hook is bypassed.
