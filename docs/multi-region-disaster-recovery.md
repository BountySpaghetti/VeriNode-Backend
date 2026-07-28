# Multi-Region Replication and Disaster Recovery

## Architecture

VeriNode runs a single writable primary region with warm standby regions. The primary publishes database changes, queue offsets, and operational heartbeats to every standby. Standbys continuously validate replay position and service health but do not accept writes until a failover decision promotes them.

Critical paths keep the issue target of **<100 ms P99** by using asynchronous cross-region replication for non-blocking commits and by gating promotion on standby latency. Strongly consistent operations should remain within the primary region and emit idempotent events for replay.

## Core failover rules

The `MultiRegionRecoveryCoordinator` evaluates regional health, replication lag, heartbeat freshness, and P99 latency. It returns one of three decisions:

- `none`: the primary is healthy and enough promotion candidates exist.
- `promote_standby`: the primary violates policy and the best standby can take over.
- `halt_writes`: no standby satisfies the safety policy, so writes should stop to avoid split brain or data loss.

Default policy values:

| Control | Default |
| --- | --- |
| Maximum replication lag | 5000 ms |
| Critical path P99 latency | 100 ms |
| Heartbeat timeout | 15000 ms |
| Minimum healthy standbys | 1 |
| Availability target | 99.99% |

## Monitoring and alerting

Expose `generatePrometheusMetrics()` output from service health endpoints or sidecars. Alert on:

- `verinode_region_replication_lag_ms > 5000` for 2 minutes.
- `verinode_region_p99_latency_ms > 100` for 5 minutes.
- `verinode_region_heartbeat_age_ms > 15000` for 1 minute.
- A `halt_writes` decision at any time.

Dashboard panels should show primary/standby health, lag by region, P99 critical-path latency, heartbeat age, failover decision history, and blue-green/canary error budgets.

## Blue-green deployment and canary analysis

1. Deploy the green stack in every standby region first.
2. Mirror read traffic and replication streams to green.
3. Shift 5%, 25%, 50%, then 100% of eligible traffic if P99 latency stays below 100 ms and error rate does not exceed baseline by 1%.
4. Promote the green primary only after all standby regions report healthy replay and heartbeat checks.
5. Keep blue available until one full replication validation cycle completes.

## Disaster recovery test runbook

1. Capture baseline metrics for all regions.
2. Inject primary heartbeat failure and confirm a `promote_standby` decision.
3. Verify the selected standby has replication lag within policy before enabling writes.
4. Exercise synthetic critical-path transactions and confirm P99 remains below 100 ms.
5. Rejoin the old primary as a standby only after replay validation.
6. Record RTO, RPO, operator actions, and any security exceptions for review.
