#!/bin/sh
set -eu

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

mkdir -p .git/hooks
cp scripts/pre-commit-hook .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "Installed VeriNode pre-commit hook at .git/hooks/pre-commit"
echo "Set VERINODE_PRECOMMIT_FULL=1 when committing to include build and test checks."
