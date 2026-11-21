-- KMON Testnet A2U only. Apply ONLY to a NEW dedicated D1 database.
-- Never run against kmon-payments-db.
-- No migrations have been applied as part of this commit.
CREATE TABLE IF NOT EXISTS a2u_payouts (
  id TEXT PRIMARY KEY NOT NULL,
  recipient_uid TEXT NOT NULL UNIQUE,
  amount TEXT NOT NULL CHECK (CAST(amount AS REAL) > 0 AND CAST(amount AS REAL) <= 0.1),
  network TEXT NOT NULL DEFAULT 'Pi Testnet' CHECK (network = 'Pi Testnet'),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (
    status IN ('reserved','creating','blocked-incomplete','payment-created',
               'submitted','verified','needs-reconciliation','cancelled')
  ),
  payment_id TEXT UNIQUE,
  txid TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_a2u_payouts_status ON a2u_payouts(status);
-- The UNIQUE recipient_uid constraint is the atomic deduplication safeguard.
-- Never automatically retry records in 'creating' or 'needs-reconciliation'.
