import assert from 'assert';
import {
  IncidentRunbookAutomation,
  PagerDutyIncidentClient,
  PagerDutyIncidentEvent,
  defaultIncidentRunbooks,
  incidentIdFor,
} from '../../src/incident/runbook_automation';

class RecordingPagerDuty implements PagerDutyIncidentClient {
  events: PagerDutyIncidentEvent[] = [];
  async trigger(event: PagerDutyIncidentEvent): Promise<void> {
    this.events.push(event);
  }
}

async function main(): Promise<void> {
  const signal = {
    service: 'api-gateway',
    summary: 'critical path P99 latency above SLO',
    severity: 'critical' as const,
    metric: 'http.server.duration.p99',
    value: 148,
    threshold: 100,
    observedAt: new Date('2026-07-25T00:00:00.000Z'),
    labels: { region: 'us-east-1' },
  };
  const client = new RecordingPagerDuty();
  const automation = new IncidentRunbookAutomation(
    { pagerDutyRoutingKey: 'routing-key', runbooks: defaultIncidentRunbooks },
    client,
  );

  const plan = await automation.trigger(signal);

  assert.strictEqual(client.events.length, 1);
  assert.strictEqual(plan.incidentId, incidentIdFor(signal, 'critical-path-latency'));
  assert.strictEqual(client.events[0].routing_key, 'routing-key');
  assert.strictEqual(client.events[0].dedup_key, plan.incidentId);
  assert.strictEqual(client.events[0].payload.custom_details.performanceTarget, 'P99 < 100ms');
  assert.strictEqual(client.events[0].payload.custom_details.availabilityTarget, '99.99%');
  assert.ok(plan.canary.rollbackCriteria.some((criterion) => criterion.includes('100ms')));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
