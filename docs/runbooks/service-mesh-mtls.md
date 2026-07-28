# Runbook: Service Mesh mTLS

## Alerts

### VeriNodeMtlsCertificateExpiringSoon

1. Confirm the current certificate expiry from `/metrics` using `verinode_mtls_certificate_seconds_until_expiry`.
2. Check cert-manager certificate status for `verinode-backend-mtls`.
3. Restart the affected pod only after a replacement certificate is present and mounted.

### VeriNodeMtlsCertificateReloadFailures

1. Check application logs for `certificate reload failed`.
2. Validate that certificate, key, and CA files exist and are readable by the pod.
3. Confirm the replacement certificate contains the expected SPIFFE URI SAN.

### VeriNodeMtlsHandshakeFailures

1. Inspect upstream service mesh telemetry for TLS negotiation failures.
2. Confirm callers use mesh sidecars and the `verinode` namespace has injection enabled.
3. Compare caller service account SPIFFE IDs with `SPIFFE_ALLOWED_IDS`.

### VeriNodeMtlsInvalidPeerIdentity

1. Treat this as a security event until proven otherwise.
2. Capture caller workload, namespace, and service account from mesh access logs.
3. Add the SPIFFE ID to the allow-list only after security review.

## Canary checks

Before promotion, verify:

- P99 latency is below 100ms for critical paths.
- `verinode_mtls_handshake_failures_total` does not increase during the canary window.
- `verinode_mtls_invalid_peer_identity_failures_total` remains zero.
- Certificate reload metrics show no failures after rotation.
