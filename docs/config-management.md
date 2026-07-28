# Configuration Management Architecture

VeriNode uses a centralized configuration manager that loads defaults, JSON files,
environment variables, and optional remote sources. Sources are priority merged,
validated against the JSON schema, and then atomically published to consumers.

## Hot reload

- File watchers poll every 250ms and trigger a debounced reload.
- `SIGHUP` also triggers reloads for container and VM deployments.
- Reload debounce is 50ms to keep the critical hot-reload path under the 100ms P99
  target before source I/O.
- Invalid reloads are rejected and the last known-good configuration remains
  active.

## Schema validation

`src/config/schema.ts` is the contract for all services. Required fields,
ranges, enum values, URI/hostname formats, arrays, nested objects, and dynamic
feature flag maps are validated before config is accepted.

## Monitoring and alerting

Emit and scrape these event-bus counters from service adapters:

| Metric | Source event | Alert |
| --- | --- | --- |
| `verinode_config_reload_total` | `reload_complete` | sudden spike over baseline |
| `verinode_config_reload_failed_total` | `error` | any production failure for 5m |
| `verinode_config_last_success_timestamp` | `reload_complete` | stale for 2x expected interval |
| `verinode_config_validation_failed_total` | thrown validation failure | any canary failure |

## Deployment

1. Deploy schema-compatible code to the green stack.
2. Mirror production config into green and run validation in CI.
3. Send canary traffic and compare config reload failures, P99 latency, and error
   rate against blue.
4. Promote green only when canary analysis passes for the configured window.
5. Roll back by routing traffic to blue; green keeps its last known-good config.
