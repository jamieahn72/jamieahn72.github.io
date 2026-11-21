// Safe isolated A2U payout engine prototype. NOT an HTTP endpoint and NOT deployed.
// Admin authorization MUST be established by a trusted server-side caller.
// A plain string supplied by a client is never sufficient.
// Pi SDK adapter response contracts must be verified against the official SDK before deployment.
export async function payoutOnceSecure({ pi, store, uid, amount, approval }) {
  if (!approval || approval.trusted !== true || approval.singleUse !== true ||
      typeof approval.consume !== 'function') throw new Error('Trusted approval required');
  if (typeof uid !== 'string' || !/^[a-zA-Z0-9_-]{4,128}$/.test(uid))
    throw new Error('Invalid UID');
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 0.1)
    throw new Error('Invalid Test Pi amount');
  if (!pi || !store) throw new Error('Missing dependencies');

  // consume() MUST atomically verify the trusted operator, recipient, amount,
  // expiry, and one-time approval token in server-side storage.
  // It MUST return true exactly once. Never accept a caller-provided implementation
  // from a public HTTP request.
  if (await approval.consume({ uid, amount }) !== true)
    throw new Error('Approval denied or already consumed');

  const claim = await store.claimUniqueRecipient(uid, amount);
  if (!claim.created) return { status: 'existing', record: claim.record };
  const id = claim.record.id;
  try {
    const incomplete = await pi.getIncompleteServerPayments();
    if (!Array.isArray(incomplete)) throw new Error('Unexpected incomplete payments response');
    if (incomplete.length > 0) {
      await store.setStatus(id, 'blocked-incomplete');
      return { status: 'blocked-incomplete' };
    }
    await store.setStatus(id, 'creating');
    const paymentId = await pi.createPayment({
      amount, uid, memo: 'KMON Testnet A2U verification',
      metadata: { internalPayoutId: id }
    });
    if (typeof paymentId !== 'string' || !paymentId)
      throw new Error('Unexpected payment ID');
    await store.setPaymentId(id, paymentId);
    const txid = await pi.submitPayment(paymentId);
    if (typeof txid !== 'string' || !txid) throw new Error('Unexpected transaction ID');
    await store.setTxid(id, txid);
    // Do not guess the SDK response shape: a separate official API reconciliation
    // implementation must independently verify chain/network, UID, amount and completion.
    await store.setStatus(id, 'needs-reconciliation');
    return { status: 'needs-reconciliation', paymentId, txid };
  } catch {
    await store.setStatus(id, 'needs-reconciliation');
    throw new Error('A2U payout needs manual reconciliation; do not retry automatically');
  }
}
