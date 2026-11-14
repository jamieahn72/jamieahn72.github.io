// Offline-only smoke test. Uses an ephemeral generated keypair, never a real wallet.
// No Pi API requests, no transaction creation, no chain submissions.
import test from 'node:test';
import assert from 'node:assert/strict';
import PiNetwork from 'pi-backend';
import * as StellarSdk from '@stellar/stellar-sdk';

test('official Pi SDK imports in Node.js', () => {
  assert.equal(typeof PiNetwork, 'function');
});
test('SDK initializes with disposable generated signing key', () => {
  const disposable = StellarSdk.Keypair.random();
  const sdk = new PiNetwork('offline-test-key-not-real', disposable.secret());
  assert.equal(typeof sdk.createPayment, 'function');
  assert.equal(typeof sdk.submitPayment, 'function');
  assert.equal(typeof sdk.completePayment, 'function');
  assert.equal(typeof sdk.getIncompleteServerPayments, 'function');
  // Never log or store disposable.secret().
});
test('SDK rejects malformed private seeds', () => {
  assert.throws(() => new PiNetwork('offline-test-key-not-real', 'invalid-seed'));
});
