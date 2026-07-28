# Database Migration Runbook

## Pre-deploy

1. Confirm every new migration has `-- @up` and `-- @down` sections.
2. Run TypeScript build and migration manager tests.
3. Apply migrations to the green database clone.
4. Verify `schema_migrations` contains the expected active version and no failed deployment alerts are firing.

## Canary analysis

- Watch `verinode_database_migration_failures_total` for any increase.
- Watch `verinode_database_migration_duration_ms` P99 and investigate any step above 100ms.
- Keep blue serving production traffic until green passes health checks and canary traffic has stable latency.

## Rollback

1. Stop canary traffic to green.
2. Execute rollback to the last known-good version boundary.
3. Confirm `rolled_back_at` is populated for reverted versions.
4. Re-route traffic to blue and open an incident review if rollback was needed.
