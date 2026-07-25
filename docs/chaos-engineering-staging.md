# Chaos Engineering Testing Blueprint for Staging

This blueprint defines how VeriNode runs controlled chaos experiments in staging without jeopardizing production safety, security review requirements, or critical-path service-level objectives.

## Objectives and bounds

- **Environment:** staging only; production experiments require a separate approval.
- **Availability target:** keep synthetic and user-journey availability at or above 99.99% during experiments.
- **Latency target:** keep critical-path P99 latency below 100 ms.
- **Blast radius:** start at 5% of replicas or traffic and never exceed 10% without incident commander approval.
- **Security:** every new experiment must pass security review before it can be scheduled.

## Architecture

1. **Experiment catalog:** scenario definitions are tracked in code through `DEFAULT_STAGING_CHAOS_BLUEPRINT` and validated before scheduling.
2. **Execution layer:** staging runs experiments through Kubernetes-native disruption tooling such as pod termination, traffic latency, packet loss, and dependency fault injection.
3. **Control plane:** a release captain approves the experiment, confirms observability coverage, and enables the experiment behind a staging-only feature flag.
4. **Observation layer:** Prometheus, traces, logs, Kafka lag metrics, database pool metrics, and synthetic probes provide steady-state validation.
5. **Abort layer:** rollback triggers stop the experiment, disable the feature flag, and page the staging incident channel.

## Standard experiment flow

1. Open a change request with the scenario, blast radius, duration, impacted services, and rollback trigger.
2. Run `validateChaosBlueprint` against the scenario bundle.
3. Confirm dashboards and alerts are healthy before injection begins.
4. Deploy through blue-green staging lanes and send 5% canary traffic to the lane under test.
5. Inject the fault for the approved duration.
6. Compare canary metrics against the baseline lane for latency, availability, error rate, queue lag, and saturation.
7. Abort immediately if a rollback trigger fires; otherwise collect findings and update the runbook.

## Required monitoring and alerting

- API gateway P50/P95/P99 latency and 5xx rate.
- Attestation, staking, rewards, queue worker, and audit service request success rates.
- Kafka consumer lag, dead-letter queue growth, and rebalance counts.
- PostgreSQL pool saturation, connection errors, and query latency.
- Redis timeout rate and retry counts.
- Error budget burn alerts at 1x warning and 2x critical.

## Runbook updates

After each experiment, record the date, owner, hypothesis, injected fault, metrics observed, customer impact, remediation items, and whether the service met the 99.99% availability and 100 ms P99 latency objectives.
