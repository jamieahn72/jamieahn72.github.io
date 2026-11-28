// KMON A2U preflight — no network requests and NO transfers.
// Run with Node.js: node a2u/preflight.mjs
// Only checks that the intended payout runtime is configured.
// Never print the value of any secret.
const required = ['PI_API_KEY', 'PI_APP_WALLET_PRIVATE_SEED'];
const missing = required.filter(name => !process.env[name]);
const seed = process.env.PI_APP_WALLET_PRIVATE_SEED || '';
const validSeedShape = /^S[A-Z2-7]{55}$/.test(seed);
const safe = {
  mode: 'preflight-only',
  payoutsEnabled: false,
  apiKeyPresent: Boolean(process.env.PI_API_KEY),
  walletSeedPresent: Boolean(seed),
  walletSeedFormatPlausible: Boolean(seed && validSeedShape),
  missing,
  readyForPayout: false,
  note: 'Preflight does not verify app-wallet ownership, balance, SDK compatibility, recipient eligibility, or authorize transfers.'
};
process.stdout.write(JSON.stringify(safe, null, 2) + '\n');
