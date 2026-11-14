-- KMON A2U D1 isolated database write/read smoke test.
-- ONLY execute in database: kmon-a2u-testnet-db
-- Never execute against kmon-payments-db.
-- No wallet keys, no payments, no Pi API calls.
-- Execute each numbered query separately in Cloudflare D1 Console.
-- This tests storage only; does not authorize or execute transfers.
-- 1. Insert a disposable row (idempotent)
INSERT OR IGNORE INTO a2u_payouts (id, recipient_uid, amount, status)
VALUES ('a2u-smoke-20261114', 'smoke_test_20261114', '0.01', 'reserved');

-- 2. Read it; expect exactly one row, with status 'reserved'
SELECT id, recipient_uid, amount, status, payment_id, txid
FROM a2u_payouts WHERE id = 'a2u-smoke-20261114';

-- 3. Check unique-recipient deduplication without triggering an error
INSERT OR IGNORE INTO a2u_payouts (id, recipient_uid, amount, status)
VALUES ('a2u-smoke-duplicate', 'smoke_test_20261114', '0.01', 'reserved');

-- 4. Expect count=1
SELECT COUNT(*) AS unique_recipient_count FROM a2u_payouts
WHERE recipient_uid = 'smoke_test_20261114';

-- 5. Clean up the disposable test data
DELETE FROM a2u_payouts WHERE recipient_uid = 'smoke_test_20261114';

-- 6. Expect remaining=0
SELECT COUNT(*) AS remaining FROM a2u_payouts
WHERE recipient_uid = 'smoke_test_20261114';
