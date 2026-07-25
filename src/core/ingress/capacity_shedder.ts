import { getConfigValue, onChangePath } from '../../config';
import { getStatus, setOverride, resetOverride } from './feature_flags';
import type { FeatureFlagStatus } from './feature_flags';

export type SheddingLevel = 'none' | 'light' | 'medium' | 'critical';

export interface CapacityThresholds {
  cpuPercent: number;
  memoryPercent: number;
  requestRatePerSec: number;
  p99LatencyMs: number;
}

export interface CapacityShedderConfig {
  checkIntervalMs: number;
  cooldownPeriodMs: number;
  thresholds: {
    light: CapacityThresholds;
    medium: CapacityThresholds;
    critical: CapacityThresholds;
  };
  flagsToShed: Record<string, FeatureFlagStatus>;
}

export interface MetricSnapshot {
  cpuPercent: number;
  memoryPercent: number;
  requestRatePerSec: number;
  p99LatencyMs: number;
  timestamp: number;
}

const DEFAULT_CONFIG: CapacityShedderConfig = {
  checkIntervalMs: 5000,
  cooldownPeriodMs: 30000,
  thresholds: {
    light: {
      cpuPercent: 70,
      memoryPercent: 75,
      requestRatePerSec: 800,
      p99LatencyMs: 500,
    },
    medium: {
      cpuPercent: 85,
      memoryPercent: 85,
      requestRatePerSec: 1200,
      p99LatencyMs: 1000,
    },
    critical: {
      cpuPercent: 95,
      memoryPercent: 95,
      requestRatePerSec: 2000,
      p99LatencyMs: 3000,
    },
  },
  flagsToShed: {},
};

let shedderConfig: CapacityShedderConfig = DEFAULT_CONFIG;
let currentLevel: SheddingLevel = 'none';
let previousLevel: SheddingLevel = 'none';
let checkTimer: ReturnType<typeof setInterval> | null = null;
let lastElevatedAt = 0;
let collector: (() => MetricSnapshot) | null = null;
let initialized = false;

export type SheddingChangeCallback = (level: SheddingLevel, previousLevel: SheddingLevel) => void;
const CHANGE_LISTENERS = new Set<SheddingChangeCallback>();

function loadConfig(): void {
  const cfg = getConfigValue('capacity_shedding');
  if (cfg && typeof cfg === 'object') {
    shedderConfig = {
      ...DEFAULT_CONFIG,
      ...cfg,
      thresholds: {
        light: { ...DEFAULT_CONFIG.thresholds.light, ...(cfg.thresholds?.light || {}) },
        medium: { ...DEFAULT_CONFIG.thresholds.medium, ...(cfg.thresholds?.medium || {}) },
        critical: { ...DEFAULT_CONFIG.thresholds.critical, ...(cfg.thresholds?.critical || {}) },
      },
      flagsToShed: { ...DEFAULT_CONFIG.flagsToShed, ...(cfg.flagsToShed || {}) },
    };
  } else {
    shedderConfig = { ...DEFAULT_CONFIG };
  }
}

function determineLevel(snapshot: MetricSnapshot): SheddingLevel {
  const { thresholds } = shedderConfig;
  if (
    snapshot.cpuPercent >= thresholds.critical.cpuPercent ||
    snapshot.memoryPercent >= thresholds.critical.memoryPercent ||
    snapshot.requestRatePerSec >= thresholds.critical.requestRatePerSec ||
    snapshot.p99LatencyMs >= thresholds.critical.p99LatencyMs
  ) {
    return 'critical';
  }
  if (
    snapshot.cpuPercent >= thresholds.medium.cpuPercent ||
    snapshot.memoryPercent >= thresholds.medium.memoryPercent ||
    snapshot.requestRatePerSec >= thresholds.medium.requestRatePerSec ||
    snapshot.p99LatencyMs >= thresholds.medium.p99LatencyMs
  ) {
    return 'medium';
  }
  if (
    snapshot.cpuPercent >= thresholds.light.cpuPercent ||
    snapshot.memoryPercent >= thresholds.light.memoryPercent ||
    snapshot.requestRatePerSec >= thresholds.light.requestRatePerSec ||
    snapshot.p99LatencyMs >= thresholds.light.p99LatencyMs
  ) {
    return 'light';
  }
  return 'none';
}

function applyShedding(level: SheddingLevel): void {
  const { flagsToShed } = shedderConfig;
  for (const [flagKey, degradedStatus] of Object.entries(flagsToShed)) {
    if (level !== 'none') {
      setOverride(flagKey, degradedStatus);
    } else {
      resetOverride(flagKey);
    }
  }
}

function notifyChange(level: SheddingLevel, previous: SheddingLevel): void {
  for (const cb of CHANGE_LISTENERS) {
    try {
      cb(level, previous);
    } catch {
      // isolate listener failures
    }
  }
}

function evaluate(): void {
  if (!collector) return;
  try {
    const snapshot = collector();
    const level = determineLevel(snapshot);
    previousLevel = currentLevel;

    if (level !== currentLevel) {
      if (level === 'none' && previousLevel !== 'none') {
        const now = Date.now();
        if (now - lastElevatedAt < shedderConfig.cooldownPeriodMs) {
          return;
        }
      }
      if (level !== 'none') {
        lastElevatedAt = Date.now();
      }
      currentLevel = level;
      applyShedding(level);
      notifyChange(level, previousLevel);
    }
  } catch {
    // isolate evaluation failures
  }
}

export function initCapacityShedder(metricCollector: () => MetricSnapshot): void {
  if (initialized) return;
  collector = metricCollector;
  loadConfig();
  onChangePath('capacity_shedding', () => {
    loadConfig();
  });
  checkTimer = setInterval(evaluate, shedderConfig.checkIntervalMs);
  initialized = true;
}

export function stopCapacityShedder(): void {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
  currentLevel = 'none';
  previousLevel = 'none';
  initialized = false;
}

export function getCurrentLevel(): SheddingLevel {
  return currentLevel;
}

export function getConfig(): CapacityShedderConfig {
  return { ...shedderConfig };
}

export function onSheddingChange(callback: SheddingChangeCallback): () => void {
  CHANGE_LISTENERS.add(callback);
  return () => {
    CHANGE_LISTENERS.delete(callback);
  };
}

export function evaluateNow(): SheddingLevel {
  evaluate();
  return currentLevel;
}

export function getMetricCollector(): (() => MetricSnapshot) | null {
  return collector;
}

export function resetForTest(): void {
  stopCapacityShedder();
  currentLevel = 'none';
  previousLevel = 'none';
  shedderConfig = { ...DEFAULT_CONFIG };
  CHANGE_LISTENERS.clear();
  initialized = false;
}
