# Secret Rotation Service

The secret rotation service manages database credentials and API keys with staged rollout, validation hooks, rollback, and Prometheus metrics.

## Architecture

1. **Inventory**: each secret has a descriptor with kind, current version, previous version, rotation due date, rollout phase, and canary percentage.
2. **Generation**: a pluggable `SecretGenerator` creates new high-entropy values. The default generator uses Node.js crypto randomness.
3. **Validation**: deployment-specific hooks verify that a generated database credential can connect, or that an API key is accepted by the downstream provider, before any traffic is shifted.
4. **Canary**: the service records a canary phase and percentage so callers can route a small slice of workers to the candidate version.
5. **Promotion**: after apply hooks complete, the candidate becomes current, the old version is marked previous, and the next rotation deadline is set.
6. **Rollback**: any generation, validation, or apply error restores the previous version and records an operator-visible failure reason.

## Operational targets

- Keep credential reads on the application hot path backed by local cache or an in-process store adapter to remain below the 100 ms P99 target.
- Run rotation orchestration out of band from request handling.
- Require at least two valid versions during canary and rollback windows.
- Never log raw secret values; metrics and labels expose only counts, phases, and fingerprints.

## Monitoring and alerts

Expose `SecretRotationService.renderPrometheus()` through the service metrics endpoint and alert on:

- `secret_rotation_failure_total` increase over five minutes.
- `secret_rotation_active_canaries` stuck above zero longer than the configured canary analysis window.
- `secret_rotation_last_duration_ms` breaching the deployment SLO.

## Blue-green and canary deployment

1. Deploy the rotation service in green with rotation workers disabled.
2. Mirror inventory reads from blue and green.
3. Enable canary rotations for non-critical API keys.
4. Compare failure, rollback, and latency metrics.
5. Enable database credential rotations after canary success.
6. Shift all workers to green and keep blue ready for rollback until the next rotation cycle completes.

## Runbook

1. List secrets due for rotation with `dueForRotation()`.
2. Rotate one secret with `rotate(name)` and watch Prometheus metrics.
3. If validation fails, inspect `lastError` on the descriptor; the service will already have rolled back to the previous version.
4. If downstream impact appears after promotion, call `rollback(name, previousVersionId, reason)` and redeploy consumers with the previous credential reference.
5. Document the rotation timestamp, version IDs, and canary results in the security review ticket.
