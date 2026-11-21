# One-time A2U approval — preparation only

This is a **non-deployed** design for the dedicated Testnet database `kmon-a2u-testnet-db`.

- `approval-schema.sql`: optional schema, **not yet applied**.
- `approval-consumer.mjs`: atomic single-use consumption using one conditional D1 UPDATE.
- No endpoint issues approvals. No endpoint accepts admin requests. No payment is initiated.
- **Do not** let a public request supply `operatorId`, `approvalId`, or a custom approval object as trusted server authority. They must be established by a separately authenticated server-side process.
- The current secure engine still expects a trusted approval object and is **not deployable** until this missing authentication/issuance path is built.
- Consume-before-reservation may burn approval on a duplicate recipient. This fails closed but needs operational review.
- Approvals are not sufficient to prove five unique wallet addresses: Pi user UID and on-chain destination must be verified against official SDK/API semantics.
- Never enter or transmit the wallet seed via chat, browser JS, or GitHub. Actual payout requires separately verified server-side signing infrastructure and reconciliation.

## Prerequisites for activation
1. Verify official Pi SDK / API semantics and network selection.
2. Implement authenticated operator-only approval issuance with short expiry.
3. Bind one approval to one verified recipient UID and exactly 0.01 Test Pi.
4. Integrate the approval consumer only from trusted Worker code.
5. Add server-side wallet signing with secret handling and no automatic retries.
6. Independently reconcile completion, UID, network, and transaction ID.
7. Confirm test results and dry-run before enabling any payout route.
