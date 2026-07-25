import assert from 'node:assert/strict';
import {
  DEFAULT_STAGING_CHAOS_BLUEPRINT,
  summarizeChaosReadiness,
  validateChaosBlueprint,
  type ChaosBlueprint,
} from '../../src/chaos/blueprint';

function testDefaultBlueprintIsSafe() {
  const result = validateChaosBlueprint(DEFAULT_STAGING_CHAOS_BLUEPRINT);
  assert.equal(result.valid, true);
  assert.deepEqual(result.findings, []);
}

function testRejectsProductionAndLooseSloTargets() {
  const unsafe: ChaosBlueprint = {
    ...DEFAULT_STAGING_CHAOS_BLUEPRINT,
    environment: 'production' as ChaosBlueprint['environment'],
    availabilityTargetPercent: 99.9,
    criticalPathP99LatencyMs: 250,
  };

  const result = validateChaosBlueprint(unsafe);
  assert.equal(result.valid, false);
  assert.equal(result.findings.length, 3);
  assert.match(result.findings[0].message, /staging only/);
}

function testRejectsScenariosWithoutGuardrails() {
  const unsafe: ChaosBlueprint = {
    ...DEFAULT_STAGING_CHAOS_BLUEPRINT,
    scenarios: [
      {
        ...DEFAULT_STAGING_CHAOS_BLUEPRINT.scenarios[0],
        blastRadiusPercent: 25,
        durationSeconds: 1200,
        steadyStateProbe: ' ',
        rollbackTrigger: '',
      },
    ],
  };

  const result = validateChaosBlueprint(unsafe);
  assert.equal(result.valid, false);
  assert.deepEqual(
    result.findings.map((finding) => finding.message),
    [
      'blast radius exceeds the approved staging guardrail',
      'duration must be between 1 and 900 seconds',
      'steady-state probe is required',
      'rollback trigger is required',
    ],
  );
}

function testSummarizesReadyScenarios() {
  const summary = summarizeChaosReadiness(DEFAULT_STAGING_CHAOS_BLUEPRINT);
  assert.equal(summary.length, DEFAULT_STAGING_CHAOS_BLUEPRINT.scenarios.length);
  assert.match(summary[0], /api-gateway/);
  assert.match(summary[1], /pod-kill/);
}

testDefaultBlueprintIsSafe();
testRejectsProductionAndLooseSloTargets();
testRejectsScenariosWithoutGuardrails();
testSummarizesReadyScenarios();
console.log('chaos blueprint tests passed');
