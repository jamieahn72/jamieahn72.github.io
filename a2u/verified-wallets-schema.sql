-- Separate verified recipient wallet registry for KMON A2U Testnet.
-- PREPARATION ONLY: not applied to Cloudflare D1.
-- Records are inserted only after independent payment verification.
-- UNIQUE recipient_wallet ensures a single wallet cannot count twice.
CREATE TABLE IF NOT EXISTS a2u_verified_wallets (
  recipient_wallet TEXT PRIMARY KEY NOT NULL
    CHECK (length(recipient_wallet) = 56 AND substr(recipient_wallet, 1, 1) = 'G'),
  recipient_uid TEXT NOT NULL UNIQUE,
  payout_id TEXT NOT NULL UNIQUE REFERENCES a2u_payouts(id),
  payment_id TEXT NOT NULL UNIQUE,
  txid TEXT NOT NULL UNIQUE,
  verified_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
