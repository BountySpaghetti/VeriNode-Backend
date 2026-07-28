# End-to-End Encryption for Sensitive Payload Fields

## Architecture

VeriNode protects sensitive payload fields with application-layer envelope encryption before data leaves a trusted service boundary. Each configured field path is replaced with a compact envelope containing the algorithm, key identifier, nonce, authentication tag, and ciphertext. Non-sensitive fields remain readable so routing, validation, and analytics can continue without decrypting protected values.

The implementation uses AES-256-GCM with per-field 96-bit nonces and authenticated additional data (AAD) composed from the deployment context, field path, and key id. This binds ciphertexts to their expected location and prevents silent cut-and-paste attacks between fields.

## Core Components

- `PayloadEncryptionService` encrypts and decrypts configured dot-path fields, including those inside arrays.
- `KeyProvider` abstracts production KMS/HSM integration and allows key rotation by resolving active and historical keys by key id.
- `StaticKeyProvider` is limited to tests, local development, and migration tooling.
- OpenTelemetry instruments emit operation latency and failure counters for SLO dashboards and alerts.

## Security Requirements

1. Store root keys only in an approved KMS/HSM; never persist raw keys in source, logs, traces, or database rows.
2. Rotate keys with a blue-green process: deploy readers with old and new key access, switch the active writer key, then re-encrypt old envelopes asynchronously.
3. Treat decryption failures as security events. Alert on any increase in `payload_encryption.failures_total`.
4. Review every addition to the sensitive field allowlist before deployment.
5. Keep P99 encryption/decryption latency under 100 ms for critical paths using `payload_encryption.operation_latency_ms`.

## Deployment Plan

1. Ship the encryption service dark-launched with reads accepting plaintext and encrypted envelopes.
2. Canary write encryption for low-risk tenants and compare error rate, P99 latency, and decrypt success rate.
3. Expand to 50% of traffic only if P99 remains below 100 ms and no decryption failures occur.
4. Complete blue-green promotion after dashboards remain healthy for one full rotation window.
5. Run a background migration to re-encrypt historical sensitive fields.

## Operational Dashboards

Dashboards should include:

- P50/P95/P99 for `payload_encryption.operation_latency_ms` by operation.
- Rate of `payload_encryption.failures_total` by operation and service.
- Active key id distribution by service instance.
- Canary cohort decrypt success rate.

## Runbook

See [Sensitive Payload Encryption Runbook](runbooks/payload-encryption.md).
