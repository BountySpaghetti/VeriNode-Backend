# Capacity Planning Runbook

## Triage

1. Open the capacity dashboard and sort forecasts by `level=critical` then shortest `capacity_days_to_exhaustion`.
2. Confirm whether the growth trend is real by comparing service traffic, deploy events, and infrastructure incidents over the retained history window.
3. If exhaustion is within seven days, declare a capacity incident and assign an owner for each affected resource.

## Mitigation

1. For `requests` or `latency`, enable graceful degradation or capacity shedding for non-critical features.
2. For `cpu` or `memory`, add replicas with a blue-green deployment and verify error rate, latency, and saturation in canary analysis.
3. For `storage`, increase the volume or reduce retention only after confirming backup health.

## Recovery

1. Keep the mitigation active until projected utilization remains below `70%` for one full forecast refresh cycle.
2. Document the observed growth rate, action taken, and whether thresholds need tuning.
3. Link the incident record to the dashboard snapshot and deployment or scaling change.
