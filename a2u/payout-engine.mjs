// A2U testnet payout engine: isolated Node.js module, NOT wired to any HTTP route.
// Inject pi SDK instance and durable store. No secrets here, no automatic execution.
// This module must not be deployed until storage and admin controls are reviewed.
export async function payoutOnce({ pi, store, uid, amount, authorization }) {
  if (authorization !== 'approved-offline') throw new Error('Not approved');
  if (!/^[a-zA-Z0-9_-]{4,128}$/.test(uid)) throw new Error('Invalid UID');
  if (!Number.isFinite(amount) || amount <= 0 || amount > 0.1) throw new Error('Invalid Test Pi amount');
  // Store must provide atomic lock + persistence, and reject duplicate recipient UIDs.
  const claim = await store.claimUniqueRecipient(uid, amount);
  if (!claim.created) return { status: 'existing', record: claim.record };
  const id = claim.record.id;
  try {
    const incomplete = await pi.getIncompleteServerPayments();
    if (incomplete.length) {
      await store.setStatus(id, 'blocked-incomplete');
      return { status: 'blocked-incomplete' };
    }
    // SDK createPayment can succeed even if network fails before we receive the id.
    // Never retry automatically; require manual reconciliation in all error cases.
    await store.setStatus(id, 'creating');
    const paymentId = await pi.createPayment({
      amount, uid, memo: 'KMON Testnet A2U verification',
      metadata: { internalPayoutId: id }
    });
    await store.setPaymentId(id, paymentId);
    const txid = await pi.submitPayment(paymentId);
    await store.setTxid(id, txid);
    const payment = await pi.completePayment(paymentId, txid);
    const valid = payment?.identifier === paymentId &&
      payment?.user_uid === uid &&
      payment?.direction === 'app_to_user' &&
      payment?.network === 'Pi Testnet' &&
      payment?.transaction?.txid === txid &&
      payment?.transaction?.verified === true &&
      payment?.status?.transaction_verified === true &&
      payment?.status?.developer_completed === true;
    await store.setStatus(id, valid ? 'verified' : 'needs-reconciliation');
    return { status: valid ? 'verified' : 'needs-reconciliation', paymentId, txid };
  } catch (error) {
    await store.setStatus(id, 'needs-reconciliation');
    throw new Error('A2U payment needs manual reconciliation before any retry', { cause: error });
  }
}
