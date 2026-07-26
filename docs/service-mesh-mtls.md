# Service Mesh Integration with Mutual TLS

## Architecture

VeriNode uses the service mesh as the system-wide mTLS enforcement point and keeps application-level certificate validation as a defense-in-depth control. The mesh sidecars terminate and originate `ISTIO_MUTUAL` traffic inside the `verinode` namespace, while the backend validates peer SPIFFE identities against the configured trust domain and explicit allow-list.

Core components:

- `deploy/mtls/istio-mtls.yaml` enables namespace sidecar injection, strict `PeerAuthentication`, mesh-wide `DestinationRule` TLS origination, and an authorization policy for VeriNode SPIFFE principals.
- `deploy/mtls/cert-manager.yaml` provisions short-lived workload certificates with SPIFFE URI SANs for the backend service account.
- `src/security/mtls.ts` loads workload certificates, enforces the 24-hour maximum validity policy, validates SPIFFE identities, exposes Prometheus metrics, and hot-reloads certificates.
- `deploy/mtls/monitoring.yaml` alerts on certificate expiry, reload failures, handshake failures, and rejected peer identities.

## Security controls

- mTLS is strict by default for in-namespace traffic.
- TLS servers require client certificates, reject unauthenticated clients, and pin TLS to version 1.3.
- Workload certificates must contain an allowed SPIFFE identity under the configured trust domain.
- Application configuration validation warns when an enabled mesh does not use explicit SPIFFE allow-lists, uses certificate validity above 24 hours, or polls certificate files too aggressively.

## Performance and availability targets

The mesh configuration is designed to keep critical-path P99 latency below 100ms by using sidecar-native mTLS, avoiding per-request certificate file IO, and reusing loaded secure contexts. Availability target is 99.99%; certificate reloads are non-disruptive and failures retain the last known-good context while emitting alerts.

## Deployment strategy

1. Apply cert-manager resources and verify `verinode-backend-mtls` is issued.
2. Deploy the green stack with mesh injection enabled and strict mTLS resources applied.
3. Route 5% of traffic to green for canary analysis.
4. Monitor P99 latency, mTLS handshake failures, invalid peer identity failures, and certificate reload failures for at least 30 minutes.
5. Promote green to 100% only when error budget burn and latency are within thresholds.
6. Keep blue warm until the next certificate reload succeeds on green.

## Rollback

If canary analysis fails, route 100% of traffic back to blue, keep strict mTLS policies in place, and inspect rejected SPIFFE identity and handshake failure metrics before retrying.
