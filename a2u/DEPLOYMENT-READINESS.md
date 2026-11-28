# KMON A2U implementation audit — 2026-11-14

## Verified by user screenshots (not by direct Cloudflare API access)
- Dedicated D1 database `kmon-a2u-testnet-db` created.
- `a2u_payouts` SQL CREATE TABLE succeeded in D1 console.
- Worker `kmon-a2u-testnet` has binding `A2U_DB` to that database.
- Deployed Worker `/db-health` returned `{"ok":true,"database":"connected","payoutsEnabled":false}`.
- Worker `/health` returned `{"ok":true,"service":"kmon-a2u-testnet","phase":"identity-only","payoutsEnabled":false}`.
- Previously verified Pi token via `/verify-recipient`.
- Existing payment Worker `kmon-payment` and Mainnet remain outside this work.

## Blockers before real payouts — do not deploy prototype
1. **Critical authorization flaw:** `a2u/payout-engine.mjs` accepts a caller-supplied literal `authorization: 'approved-offline'`. This is a placeholder, NOT authentication or authorization. Must replace with a trusted server-side admin identity and single-use approval.
2. **No actual SDK integration:** the prototype expects an injected `pi` instance; package/runtime compatibility with Cloudflare Workers has not been proven. Do not assume Node.js SDK works in Worker.
3. **No operational endpoint:** deployed Worker only verifies identity and checks DB; it does not create payments, sign, submit, or complete A2U.
4. **No reconciliation implementation:** after uncertain errors, payment IDs and transaction state must be reconciled against Pi API before any retry.
5. **No verified app-wallet seed:** private seed must be stored exclusively in a secure server-side secret store and must correspond to the Testnet app wallet. Never put it in repository, frontend, screenshots, or chat.
6. **Recipient identity and consent:** recipient UID must be obtained by server-side Pi access-token verification, not from client input; admin should approve an explicit list of 5 unique recipients and amount.
7. **Database transition checks:** `d1-store.mjs` currently permits some status transitions too broadly and is a prototype; enforce state-machine transitions and single-writer locks before deployment.
8. **SDK response-shape validation:** prototype payment network/status assertions must be compared with real official SDK response types; don't mark completed based on guessed fields.
9. **Actual D1 write/read transaction test** not yet performed (only table existence read was verified).
10. **Tests not proven green:** GitHub Actions configuration exists, but no passing CI run was confirmed.

## Safe next engineering action
Build an isolated, no-transfer D1 write/read/rollback test and validate it on the dedicated DB only. Then run a separate SDK compatibility test without any private seed or payments. Do not add a public payout endpoint or activate payouts until all blockers are resolved.

## Scope
This is a preparation-only branch. No automatic payouts, no live credentials, and no production code modifications.
