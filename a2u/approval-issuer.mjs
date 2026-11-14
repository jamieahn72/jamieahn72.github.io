// Strict server-side issuance of an A2U approval. NOT deployed.
// Caller MUST authenticate the operator before invoking this function.
// No public HTTP handler is provided. Approval ID must be generated server-side.
export async function issueA2UApproval({ db, operator, uid, amount, now = new Date(), randomUUID = () => crypto.randomUUID() }) {
  if (!db || typeof db.prepare !== 'function') throw new Error('D1 required');
  // operator is a verified identity returned by an authenticated server-side gate,
  // NEVER a value copied from a request body or query parameter.
  if (!operator || operator.authenticated !== true || operator.role !== 'a2u-operator' ||
      typeof operator.id !== 'string' || !/^[a-zA-Z0-9_-]{4,128}$/.test(operator.id))
    throw new Error('Authenticated A2U operator required');
  if (typeof uid !== 'string' || !/^[a-zA-Z0-9_-]{4,128}$/.test(uid))
    throw new Error('Invalid recipient UID');
  if (amount !== 0.01) throw new Error('Only 0.01 Test Pi approval supported');
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid clock');
  const approvalId = randomUUID();
  if (typeof approvalId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(approvalId))
    throw new Error('Invalid generated approval ID');
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const result = await db.prepare(
    `INSERT INTO a2u_approvals (approval_id, recipient_uid, amount, approved_by, expires_at)
     VALUES (?, ?, '0.0100000', ?, ?)`
  ).bind(approvalId, uid, operator.id, expiresAt).run();
  if (result.meta?.changes !== 1) throw new Error('Approval creation failed');
  return { approvalId, expiresAt, uid, amount: 0.01 };
}
