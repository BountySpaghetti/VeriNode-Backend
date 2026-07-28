/**
 * VeriNode Backend — Distributed Job Scheduler
 *
 * Public API for the distributed job scheduler with lease-based
 * worker claiming. Supports high-concurrency job distribution
 * with PostgreSQL SKIP LOCKED for P99 < 100ms lease acquisition.
 *
 * Usage:
 *   const scheduler = new JobScheduler({ db });
 *   scheduler.registerWorker('email_send', async (payload, ctx) => { ... });
 *   scheduler.startAll();
 *   await scheduler.schedule('email_send', { to: '...', body: '...' });
 */

export { JobScheduler, JobWorker } from './scheduler';
export { PostgresJobStore } from './job_store';
export { JobSchedulerMetrics } from './metrics';

export type {
  JobDefinition,
  JobType,
  JobStatus,
  JobHandler,
  JobExecutionContext,
  JobStore,
  ScheduleOptions,
  WorkerConfig,
  LeaseConfig,
} from './types';

export { DEFAULT_LEASE_CONFIG, DEFAULT_WORKER_CONFIG } from './types';
