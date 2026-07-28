# Service Level Objective Monitoring and Burn Rate Alerts

## Architecture

VeriNode tracks system-wide SLOs from service telemetry and evaluates burn rate across multiple windows. The default objectives are:

- **Availability:** 99.99% successful requests over 30 days.
- **Critical-path latency:** 99.9% of critical-path requests below **100ms P99** over 30 days.

`BurnRateMonitor` accepts pre-aggregated window samples from Prometheus, OpenTelemetry collectors, or another metrics backend. Each sample contains good events and total events for a named window such as `5m`, `1h`, `6h`, or `3d`. The monitor converts the observed error rate into a burn rate by dividing by the SLO's allowed error rate.

## Alert policy

The implementation uses a multi-window, multi-burn alert policy:

| Window | Burn-rate threshold | Severity |
| --- | ---: | --- |
| 5m | 14.4x | critical |
| 1h | 6x | critical |
| 6h | 3x | warning |
| 3d | 1x | warning |

A warning indicates that the 30-day error budget is being consumed too quickly. A critical alert pages operators because the error budget could be exhausted rapidly without intervention.

## Dashboards

Dashboards should include these panels for every service and route family:

1. Availability SLO compliance and error-budget remaining.
2. Critical-path P99 latency with the 100ms threshold line.
3. Burn rate by window (`5m`, `1h`, `6h`, and `3d`).
4. Alert state and recent deployments/canaries for correlation.

## Blue-green and canary deployment checks

During blue-green deployments, send green traffic through the same SLO evaluator before promotion. Start with a 5% canary, then 25%, then 50%, and promote only when the green burn-rate status remains healthy for the `5m` and `1h` windows and P99 critical-path latency remains below 100ms.

Rollback if any critical burn-rate threshold fires, if warning thresholds persist for more than 30 minutes, or if the canary's P99 latency exceeds the 100ms target.

## Runbook

1. Check the violated SLO, window, burn rate, and error-budget remaining in the alert payload.
2. Compare the alert start time with the deployment timeline and canary analysis.
3. If critical, halt rollout and route traffic back to the blue environment.
4. Inspect route-level error and latency panels to isolate the failing service.
5. File an incident summary with the SLO ID, burn-rate window, suspected cause, mitigation, and follow-up action items.
