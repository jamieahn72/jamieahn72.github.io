// Cloudflare D1 adapter for isolated A2U database. NOT deployed.
// Expects a D1 binding (e.g. env.A2U_DB) pointing to a NEW dedicated database.
// No API keys, seeds, wallet access, or payment requests.
export function makeA2UStore(db) {
  if (!db || typeof db.prepare !== 'function') throw new Error('A2U D1 binding required');
  const get = async (id) => db.prepare('SELECT * FROM a2u_payouts WHERE id = ?').bind(id).first();
  return {
    async claimUniqueRecipient(uid, amount) {
      if (typeof uid !== 'string' || !uid || !Number.isFinite(amount) || amount <= 0 || amount > 0.1)
        throw new Error('Invalid payout request');
      const id = crypto.randomUUID();
      const insert = await db.prepare(
        'INSERT OR IGNORE INTO a2u_payouts (id, recipient_uid, amount) VALUES (?, ?, ?)'
      ).bind(id, uid, amount.toFixed(7)).run();
      const created = insert.meta?.changes === 1;
      const record = await db.prepare('SELECT * FROM a2u_payouts WHERE recipient_uid = ?').bind(uid).first();
      if (!record) throw new Error('Unable to read payout reservation');
      return { created, record };
    },
    async setStatus(id, status) {
      const allowed = new Set(['creating','blocked-incomplete','payment-created','submitted','verified','needs-reconciliation','cancelled']);
      if (!allowed.has(status)) throw new Error('Invalid payout status');
      const result = await db.prepare(
        "UPDATE a2u_payouts SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
      ).bind(status, id).run();
      if (result.meta?.changes !== 1) throw new Error('Payout record missing');
    },
    async setPaymentId(id, paymentId) {
      if (typeof paymentId !== 'string' || !paymentId) throw new Error('Missing payment ID');
      const result = await db.prepare(
        "UPDATE a2u_payouts SET payment_id = ?, status = 'payment-created', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND payment_id IS NULL"
      ).bind(paymentId, id).run();
      if (result.meta?.changes !== 1) throw new Error('Payment ID persistence failed; reconcile manually');
    },
    async setTxid(id, txid) {
      if (typeof txid !== 'string' || !txid) throw new Error('Missing txid');
      const result = await db.prepare(
        "UPDATE a2u_payouts SET txid = ?, status = 'submitted', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND payment_id IS NOT NULL AND txid IS NULL"
      ).bind(txid, id).run();
      if (result.meta?.changes !== 1) throw new Error('Transaction persistence failed; reconcile manually');
    },
    get
  };
}
