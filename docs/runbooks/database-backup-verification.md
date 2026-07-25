# Scheduled Database Backup Verification with Restore Testing

## Architecture

VeriNode verifies backups by restoring the latest production backup into an isolated canary database, then running deterministic SQL probes through `BackupVerificationService`. The verifier persists each result to `database_backup_verifications` and checks backup freshness, manifest integrity, minimum object and byte counts, required schema version, and post-restore read probes before a backup is trusted.

## Schedule and deployment

- Run daily at 02:30 UTC from the backup-verifier worker.
- Use blue-green infrastructure: restore into the inactive verification database, run checks, then swap only the verifier target after success.
- Canary analysis requires three consecutive successful restore verifications before changing backup retention, backup engine settings, or restore automation.

## Monitoring and alerting

Scrape the verifier metrics and alert when `db_backup_verification_last_failed` is `1` or when no successful verification has been recorded in 26 hours. The core metrics are:

- `db_backup_verification_runs_total`
- `db_backup_verification_failures_total`
- `db_backup_verification_duration_ms`
- `db_backup_verification_last_success`
- `db_backup_verification_last_failed`

## Operator response

1. Confirm the latest backup manifest exists and has a valid checksum.
2. Inspect `database_backup_verifications` for failed findings.
3. Re-run restore verification against an isolated database; never restore directly over production.
4. If restore checks still fail, page the database owner and freeze backup retention deletion until a passing backup is produced.
5. Document the incident, failed backup ID, root cause, and recovery point objective impact.
