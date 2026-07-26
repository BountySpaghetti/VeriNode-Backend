# Database Migration Versioning and Rollback Architecture

VeriNode database changes are managed as ordered SQL migration files in `src/database/migrations`. Each filename starts with a zero-padded version prefix, for example `010_config_drift_alerts.sql`. The migration runner records active versions in the `schema_migrations` table and only executes versions that are not currently active.

## Migration file format

New reversible migrations should use explicit `-- @up` and `-- @down` sections:

```sql
-- @up
CREATE TABLE example(id BIGSERIAL PRIMARY KEY);

-- @down
DROP TABLE example;
```

Legacy one-way SQL files without these markers are treated as forward-only with a no-op rollback to preserve compatibility. Security review should reject new migrations without a meaningful rollback unless the change is deliberately irreversible and documented.

## Runtime flow

1. The runner creates `schema_migrations` if it does not exist.
2. Pending migrations are discovered from disk, sorted by version, and compared with active records.
3. Each migration runs inside a transaction, writes its version, checksum, and execution time, then emits a monitoring event.
4. Rollback targets a version boundary and runs active migrations above that version in descending order.
5. Rollback marks records with `rolled_back_at` so the same version can be applied again during a blue-green retry.

## Operational guarantees

- Critical-path impact is isolated from request handling because migrations run out-of-band as deployment jobs.
- All apply and rollback operations use database transactions to avoid partially applied versions.
- The event sink can publish duration, success, and failure signals to Prometheus or the existing telemetry pipeline.
- Blue-green deployment should run migrations against the green environment first, canary application traffic, then promote green only after migration error rate is zero and P99 migration step time remains below 100ms for lightweight DDL checks.
