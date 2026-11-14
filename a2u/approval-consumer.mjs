// KMON A2U one-time approval consumption (prototype, NOT deployed).
// IMPORTANT: This function ONLY consumes a previously issued approval.
// Approval issuance is handled separately by operator-approval-service.mjs; no HTTP route is deployed.
// Never expose this function through a public route without trusted admin auth.
export function makeApprovalConsumer(db, { operatorId, approvalId }) {
  if (!db || typeof db.prepare !== 'function') throw new Error('D1 required');
  if (typeof operatorId !== 'string' || !/^[^\s@]{1,64}@[^\s@]{1,190}$/.test(operatorId) ||
      typeof approvalId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(approvalId))
    throw new Error('Invalid trusted approval context');
  return Object.freeze({
    trusted: true,
    singleUse: true,
    async consume({ uid, amount }) {
      if (typeof uid !== 'string' || !/^[a-zA-Z0-9_-]{4,128}$/.test(uid) ||
          amount !== 0.01) return false;
      // One atomic UPDATE: only one caller can change consumed_at from NULL.
      // Do not allow arbitrary approvals to be created by untrusted clients.
      const result = await db.prepare(
        `UPDATE a2u_approvals
         SET consumed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE approval_id = ?
           AND approved_by = ?
           AND recipient_uid = ?
           AND amount = '0.0100000'
           AND consumed_at IS NULL
           AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')`
      ).bind(approvalId, operatorId, uid).run();
      return result.meta?.changes === 1;
    }
  });
}
