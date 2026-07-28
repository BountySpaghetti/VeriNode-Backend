# Capacity Planning with Historical Usage Trending

VeriNode capacity planning is implemented as a lightweight, in-process forecasting module that accepts normalized usage samples for every service/resource pair. Samples include a service name, resource type, current value, provisioned capacity, and timestamp. The planner retains recent history, computes a linear daily growth trend, and produces a forecast with current utilization, projected utilization, days to exhaustion, confidence, severity, and an operator recommendation.

## Architecture

1. Services emit resource usage samples for `cpu`, `memory`, `storage`, `requests`, and `latency`.
2. The planner stores a bounded rolling history per `service/resource` key to avoid unbounded memory growth on critical paths.
3. Forecasts are calculated on demand with ordinary least-squares trend analysis. This keeps ingestion O(n) for the retained key history and avoids background jobs in latency-sensitive paths.
4. Prometheus text metrics expose current utilization, projected utilization, and days to exhaustion for alerting and dashboards.
5. Operators consume the forecast list sorted by severity to drive blue-green expansion and canary validation.

## Alerting and dashboards

Recommended alerts:

- Page when `capacity_days_to_exhaustion` is between `0` and `7` for any production service.
- Ticket when projected utilization exceeds `85%` within the forecast window.
- Dashboard panels should group `capacity_current_utilization_percent` and `capacity_projected_utilization_percent` by `service`, `resource`, and `level`.

## Deployment strategy

Deploy collectors and forecast consumers behind a feature flag. During blue-green rollout, compare the old and new environments for forecast parity before shifting traffic. Canary analysis should verify that metric scrape size, forecast latency, and memory retention remain inside the service SLOs.

## Security and availability

The planner stores only operational aggregates and does not require raw request payloads or customer data. Inputs are validated before retention. Forecasting is local and dependency-free, so transient telemetry backend outages do not affect request handling.
