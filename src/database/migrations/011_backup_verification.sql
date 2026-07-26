-- Migration 011: scheduled database backup restore verification audit trail.
CREATE TABLE IF NOT EXISTS database_backup_verifications (
  verification_id TEXT PRIMARY KEY,
  backup_id TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  duration_ms DOUBLE PRECISION NOT NULL CHECK (duration_ms >= 0),
  findings JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_db_backup_verifications_checked_at
  ON database_backup_verifications (checked_at DESC);

-- Optional pg_cron hook. The restore job itself runs in isolated blue-green/canary
-- infrastructure; cron only records the desired UTC cadence for operators.
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'verinode_backup_restore_verification_daily',
      '30 2 * * *',
      $job$SELECT 1$job$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron backup verification schedule not installed: %', SQLERRM;
END $cron$;
