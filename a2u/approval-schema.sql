-- KMON A2U testnet: one-time payout approval records.
-- Apply ONLY to dedicated kmon-a2u-testnet-db after review.
-- No Pi API calls and no payouts.
CREATE TABLE IF NOT EXISTS a2u_approvals (
  approval_id TEXT PRIMARY KEY NOT NULL,
  recipient_uid TEXT NOT NULL,
  amount TEXT NOT NULL CHECK (amount = '0.0100000'),
  approved_by TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);
CREATE INDEX IF NOT EXISTS idx_a2u_approvals_recipient
ON a2u_approvals (recipient_uid, consumed_at);
