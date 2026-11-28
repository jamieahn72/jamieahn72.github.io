// Tests for isolated A2U payout logic. No network, no real Pi, no secrets.
import assert from 'node:assert/strict';
import test from 'node:test';
import { payoutOnce } from './payout-engine.mjs';
function fakeStore() {
  const state = { records: new Map(), statuses: [], created: 0 };
  return {
    state,
    async claimUniqueRecipient(uid, amount) {
      if (state.records.has(uid)) return { created: false, record: state.records.get(uid) };
      const record = { id: 'test-' + ++state.created, uid, amount };
      state.records.set(uid, record);
      return { created: true, record };
    },
    async setStatus(id, status) { state.statuses.push([id, status]); },
    async setPaymentId(id, paymentId) { state.paymentId = paymentId; },
    async setTxid(id, txid) { state.txid = txid; },
  };
}
const uid = 'testuser_1234';
const amount = 0.01;
const pi = {
  async getIncompleteServerPayments() { return []; },
  async createPayment(data) { assert.equal(data.uid, uid); return 'payment-1'; },
  async submitPayment(id) { assert.equal(id, 'payment-1'); return 'tx-1'; },
  async completePayment(id, txid) {
    return {
      identifier: id, user_uid: uid, direction: 'app_to_user',
      network: 'Pi Testnet', transaction: { txid, verified: true },
      status: { transaction_verified: true, developer_completed: true }
    };
  }
};
test('no approval: no payout call', async () => {
  let called = false;
  await assert.rejects(payoutOnce({ pi: { ...pi, createPayment: async () => { called = true; } }, store: fakeStore(), uid, amount }), /Not approved/);
  assert.equal(called, false);
});
test('successful payout verifies payment and prevents repeat', async () => {
  const store = fakeStore();
  const args = { pi, store, uid, amount, authorization: 'approved-offline' };
  const first = await payoutOnce(args);
  assert.equal(first.status, 'verified');
  assert.equal(store.state.paymentId, 'payment-1');
  assert.equal(store.state.txid, 'tx-1');
  const second = await payoutOnce(args);
  assert.equal(second.status, 'existing');
  assert.equal(store.state.created, 1);
});
test('incomplete payment blocks a new payment', async () => {
  const store = fakeStore();
  const result = await payoutOnce({
    pi: { ...pi, getIncompleteServerPayments: async () => [{ identifier: 'old-payment' }] },
    store, uid, amount, authorization: 'approved-offline'
  });
  assert.equal(result.status, 'blocked-incomplete');
  assert.equal(store.state.paymentId, undefined);
});
test('uncertain create failure requires reconciliation and never retries automatically', async () => {
  const store = fakeStore();
  const args = { pi: { ...pi, createPayment: async () => { throw new Error('simulated timeout'); } }, store, uid, amount, authorization: 'approved-offline' };
  await assert.rejects(payoutOnce(args), /manual reconciliation/);
  assert.equal(store.state.statuses.at(-1)[1], 'needs-reconciliation');
  const second = await payoutOnce(args);
  assert.equal(second.status, 'existing');
});
test('wrong network cannot be marked verified', async () => {
  const store = fakeStore();
  const result = await payoutOnce({
    pi: { ...pi, completePayment: async (...args) => ({ ...(await pi.completePayment(...args)), network: 'Pi Network' }) },
    store, uid, amount, authorization: 'approved-offline'
  });
  assert.equal(result.status, 'needs-reconciliation');
});
