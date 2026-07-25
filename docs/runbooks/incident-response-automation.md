# Incident Response Runbook Automation

## Architecture

VeriNode incident automation converts SLO alerts into deterministic runbook plans and PagerDuty Events API v2 triggers. The core module is intentionally small and dependency-light so alert critical paths stay below the 100ms P99 target before the outbound PagerDuty network call.

```text
SLO alert -> IncidentSignal -> runbook matcher -> AutomationPlan -> PagerDuty trigger
                                      |
                                      +-> dashboard links, canary criteria, rollback criteria
```

## PagerDuty Integration

Set `PAGERDUTY_ROUTING_KEY` to the service Events API integration key. Every incident receives a stable `dedup_key` derived from service, metric, severity, runbook, and region so repeated pages correlate into one PagerDuty incident.

## Default Runbook: Critical Path Latency

1. Confirm the P99 latency breach for the active and canary stacks.
2. Shift traffic away from the degraded blue-green color in bounded increments.
3. Continue canary analysis for 15 minutes.
4. Roll back if P99 latency exceeds 100ms for two consecutive windows, the PagerDuty incident retriggers as critical, or a rollback command fails.

## Monitoring and Alerting

Dashboards must show:

- P50/P95/P99 latency for critical request paths.
- Error rate and saturation by service and deployment color.
- PagerDuty trigger counts by `dedup_key` and runbook ID.
- Runbook step duration and failure counts.

## Blue-Green and Canary Deployment

Deploy automation changes to the idle color first, route 5% of eligible alerts to the canary, and compare plan latency, PagerDuty trigger success, and runbook match accuracy for at least 15 minutes before promoting to 100%.

## Security Review Checklist

- Keep PagerDuty routing keys in the secret manager only.
- Do not include secrets, tokens, request bodies, or PII in `custom_details`.
- Verify runbook commands are allow-listed before wiring them to an executor.
- Ensure PagerDuty errors are logged without echoing routing keys.
