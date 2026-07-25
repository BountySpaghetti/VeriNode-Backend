#!/usr/bin/env bash
# Bootstrap a VeriNode Backend local development workstation.
# Safe to re-run: existing dependencies and local config are reused unless
# ONBOARD_FORCE_INSTALL=1 is set.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MIN_NODE_MAJOR="${MIN_NODE_MAJOR:-18}"
PACKAGE_MANAGER="${PACKAGE_MANAGER:-npm}"
RUN_TESTS="${RUN_TESTS:-0}"
ONBOARD_FORCE_INSTALL="${ONBOARD_FORCE_INSTALL:-0}"

log() { printf '\033[1;34m[onboard]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[onboard:warn]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[onboard:error]\033[0m %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

semver_major() {
  printf '%s' "$1" | sed -E 's/^v?([0-9]+).*/\1/'
}

run_step() {
  log "$1"
  shift
  "$@"
}

copy_example_config() {
  if [[ -f config.json ]]; then
    log "config.json already exists; leaving it unchanged."
    return
  fi

  if [[ -f config.json.example ]]; then
    cp config.json.example config.json
    log "Created config.json from config.json.example. Review local secrets before running production-like flows."
  else
    warn "config.json.example not found; skipping config.json creation."
  fi
}

install_dependencies() {
  case "$PACKAGE_MANAGER" in
    npm)
      require_cmd npm
      if [[ "$ONBOARD_FORCE_INSTALL" == "1" || ! -d node_modules ]]; then
        if [[ -f package-lock.json ]]; then
          run_step "Installing dependencies with npm ci." npm ci
        else
          run_step "Installing dependencies with npm install." npm install
        fi
      else
        log "node_modules already exists; set ONBOARD_FORCE_INSTALL=1 to reinstall."
      fi
      ;;
    pnpm)
      require_cmd pnpm
      if [[ "$ONBOARD_FORCE_INSTALL" == "1" || ! -d node_modules ]]; then
        if [[ -f pnpm-lock.yaml ]]; then
          run_step "Installing dependencies with pnpm install --frozen-lockfile." pnpm install --frozen-lockfile
        else
          run_step "Installing dependencies with pnpm install." pnpm install
        fi
      else
        log "node_modules already exists; set ONBOARD_FORCE_INSTALL=1 to reinstall."
      fi
      ;;
    *)
      fail "Unsupported PACKAGE_MANAGER '$PACKAGE_MANAGER'. Use npm or pnpm."
      ;;
  esac
}

main() {
  log "Bootstrapping VeriNode Backend in $ROOT_DIR"
  require_cmd node
  require_cmd git

  node_version="$(node --version)"
  node_major="$(semver_major "$node_version")"
  if [[ "$node_major" -lt "$MIN_NODE_MAJOR" ]]; then
    fail "Node.js $MIN_NODE_MAJOR+ is required; found $node_version."
  fi
  log "Node.js $node_version detected."

  copy_example_config
  install_dependencies

  run_step "Building TypeScript sources." "$PACKAGE_MANAGER" run build

  if [[ "$RUN_TESTS" == "1" ]]; then
    run_step "Running test suite." "$PACKAGE_MANAGER" test
  else
    log "Skipping tests by default. Re-run with RUN_TESTS=1 to execute npm test."
  fi

  cat <<'NEXT_STEPS'

Local development setup is ready.
Next steps:
  1. Review config.json for service-specific local values.
  2. Start the API with: node index.js
  3. Run full tests when needed with: RUN_TESTS=1 scripts/onboard-local-dev.sh
NEXT_STEPS
}

main "$@"
