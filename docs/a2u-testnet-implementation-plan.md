# KMON Testnet A2U — isolated implementation plan

Status: preparation only; no payouts enabled. Do not merge or deploy until reviewed.

## Confirmed existing architecture
- Existing Testnet app page: `sandbox.html` (Pi sandbox=true).
- Existing identity-only test page: `a2u-verify-test.html`, which calls `https://kmon-a2u-testnet.jamieahn72.workers.dev/verify-recipient`.
- Identity verification currently succeeds. The existing Cloudflare Worker is **not** a payout service.
- Keep `kmon-payment`, Mainnet, and existing login untouched.

## Official A2U flow
Official Node.js SDK: https://github.com/pi-apps/pi-nodejs (npm: pi-backend).
1. Verify Pi access token on server; derive `uid` from Pi API, never trust client-supplied uid.
2. Require explicit admin authorization and a fixed small Test Pi amount, unique per-recipient payout record, and a confirmed Testnet app wallet.
3. Initialize `PiNetwork(apiKey, walletPrivateSeed)` **server-side only**. The private seed begins with S and must never enter HTML, GitHub, logs, screenshots or chat.
4. `createPayment({amount,memo,metadata,uid})`; persist payment ID durably BEFORE continuing.
5. `submitPayment(paymentId)`; persist txid durably.
6. `completePayment(paymentId,txid)`; verify direction `app_to_user`, network `Pi Testnet`, and completed/verified flags.
7. Log unique recipient uid and successful payment ID/txid; reconcile incomplete payments before retries. Never blindly repeat a payout after a timeout.

## Deployment safety gates
- Cloudflare Workers runtime compatibility with pi-backend/Stellar signing has NOT been verified. Do not copy Node.js SDK directly into the live Worker without an isolated compatibility test. A separate Node.js service may be required.
- Do not expose any payout endpoint publicly until server-side authentication, admin authorization, rate limits, anti-replay, durable idempotency and transaction audit exist.
- Keep payouts disabled by default; do not execute a transfer as part of a health check.
- Use encrypted deployment secrets for API key and private seed. A Testnet app-wallet private seed must be handled only in a trusted server-side secret store.
- Start with one approved small Test Pi transfer, verify on Pi Testnet and in Developer Portal, then repeat with four other unique recipients.
- Five successful transfers are a technical target; final Developer Portal eligibility must be confirmed in the portal itself.

## Current blocker
The actual `kmon-a2u-testnet` Cloudflare Worker source and secret configuration are not stored in this repository. Its full deployed code and environment must be reviewed separately before integration. This branch intentionally contains no operational payout endpoint and changes no production functionality.
