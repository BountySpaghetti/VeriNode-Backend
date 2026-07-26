# Sensitive Payload Encryption Runbook

## Alerts

- `payload_encryption.failures_total` greater than zero for five minutes.
- `payload_encryption.operation_latency_ms` P99 above 100 ms for ten minutes.
- Active key id mismatch across more than one deployment generation.

## Triage

1. Identify the affected operation (`encrypt` or `decrypt`) and service instance.
2. Confirm the active KMS key id matches the deployment manifest.
3. If decrypt failures started after key rotation, roll back the active writer key and keep readers on both old and new keys.
4. Preserve failed envelopes for security analysis, but do not paste plaintext payloads into tickets or logs.

## Rollback

1. Disable encrypted writes using the deployment feature flag.
2. Keep decrypt support enabled until all canary traffic drains.
3. Re-run contract and payload encryption tests before retrying rollout.
