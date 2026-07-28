# Structured Logging with OpenTelemetry Semantic Conventions

VeriNode emits newline-delimited JSON logs that follow the OpenTelemetry log data model. The shared logger lives in `src/diagnostics/logger.ts` and should replace direct `console.log`, `console.warn`, and `console.error` calls in runtime services.

## Log shape

Every record includes:

- `timestamp` in ISO-8601 format.
- `severity_number` and `severity_text` using the OpenTelemetry 1-24 severity scale.
- `body` for the human-readable event message.
- `resource.service.name` and `resource.service.version`.
- `attributes` for queryable dimensions using OpenTelemetry semantic convention keys where available, such as `http.request.method`, `url.path`, `db.system`, `messaging.system`, `messaging.kafka.consumer.group`, `server.address`, `file.path`, and `error.message`.
- `trace_id`, `span_id`, and `trace_flags` when an active OpenTelemetry span exists.

## Usage

```ts
import { createLogger } from '../diagnostics/logger';

const log = createLogger('payments', { 'service.namespace': 'verinode' });
log.info('Payment authorized', {
  'http.request.method': 'POST',
  'url.path': '/payments',
  'http.response.status_code': 202,
});
```

## Migration and deployment

1. Enable dual-write during canary deployments with `VERINODE_LOG_DUAL_WRITE=true` so legacy text logs continue to appear on stderr while structured JSON is emitted on stdout.
2. Run a blue-green deployment with the green slice receiving 5% of traffic for at least 30 minutes.
3. Compare log ingestion error rate, critical path P99 latency, and error-log volume between blue and green. Roll back if P99 increases by 100ms or more, ingestion failures exceed 1%, or green error rate is more than 2x blue.
4. Disable dual-write once dashboards and alerts are confirmed.

## Alerting and dashboards

Import `deploy/observability/structured-logging-alerts.yaml` into Prometheus-compatible alerting and `deploy/observability/structured-logging-dashboard.json` into Grafana. The alerts track log ingestion failures, elevated error-log rate, and critical path latency regression.
