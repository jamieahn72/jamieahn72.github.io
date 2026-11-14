// Read-only progress and unique-wallet registration for verified Testnet A2U payouts.
// NOT deployed. Registration must only be called after verifyA2UCompletion
// with server-derived expected values and a trusted fresh Pi API response.
import { verifyA2UCompletion } from './verify-completion.mjs';
export async function recordVerifiedWallet({ db, payment, expected, payoutId }) {
  if (!db || typeof db.prepare !== 'function') throw new Error('D1 required');
  if (typeof payoutId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(payoutId))
    throw new Error('Invalid payout ID');
  if (!verifyA2UCompletion(payment, expected)) throw new Error('A2U payment not verified');
  const wallet=payment.to_address;
  if (!/^G[A-Z2-7]{55}$/.test(wallet)) throw new Error('Invalid Pi recipient wallet');
  // Confirm the existing reserved payout matches this payment before counting.
  // Never trust a payoutId alone or accept a client-supplied PaymentDTO.
  const row=await db.prepare(
    'SELECT id, recipient_uid, amount, payment_id, txid, status FROM a2u_payouts WHERE id = ?'
  ).bind(payoutId).first();
  if (!row || row.recipient_uid!==payment.user_uid ||
      Number(row.amount)!==payment.amount ||
      row.payment_id!==payment.identifier ||
      row.txid!==payment.transaction.txid ||
      !['submitted','needs-reconciliation','verified'].includes(row.status))
    throw new Error('Payout record mismatch');
  // INSERT OR IGNORE is intentional: collisions on wallet, UID, payout, payment or txid
  // never increase the unique-wallet count. A repeat of the SAME payout is idempotent.
  await db.prepare(
    'INSERT OR IGNORE INTO a2u_verified_wallets (recipient_wallet, recipient_uid, payout_id, payment_id, txid) VALUES (?, ?, ?, ?, ?)'
  ).bind(wallet,payment.user_uid,payoutId,payment.identifier,payment.transaction.txid).run();
  const recorded=await db.prepare(
    'SELECT recipient_wallet, recipient_uid, payout_id, payment_id, txid FROM a2u_verified_wallets WHERE payout_id = ?'
  ).bind(payoutId).first();
  if (!recorded || recorded.recipient_wallet!==wallet ||
      recorded.recipient_uid!==payment.user_uid ||
      recorded.payment_id!==payment.identifier ||
      recorded.txid!==payment.transaction.txid)
    throw new Error('Wallet already recorded for another payout or conflict');
  const count=await db.prepare('SELECT COUNT(*) AS total FROM a2u_verified_wallets').first();
  const total=Number(count?.total);
  if (!Number.isSafeInteger(total) || total<0) throw new Error('Invalid verified wallet count');
  return { verifiedUniqueWallets:total, target:5, complete:total>=5 };
}
