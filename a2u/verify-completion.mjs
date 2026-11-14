// Pure verification of official Pi Node.js SDK PaymentDTO (src/types/index.ts).
// Does not submit, sign, or complete any transaction.
export function verifyA2UCompletion(payment, expected) {
  if (!payment || !expected) return false;
  const { paymentId, uid, amount, txid, appWalletAddress, recipientWalletAddress } = expected;
  if (![paymentId, uid, txid, appWalletAddress, recipientWalletAddress].every(x => typeof x === 'string' && x.length > 0)) return false;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return false;
  return payment.identifier === paymentId &&
    payment.user_uid === uid &&
    payment.amount === amount &&
    payment.network === 'Pi Testnet' &&
    payment.direction === 'app_to_user' &&
    payment.from_address === appWalletAddress &&
    payment.to_address === recipientWalletAddress &&
    payment.transaction?.txid === txid &&
    payment.transaction?.verified === true &&
    payment.status?.developer_approved === true &&
    payment.status?.transaction_verified === true &&
    payment.status?.developer_completed === true &&
    payment.status?.cancelled === false &&
    payment.status?.user_cancelled === false;
}
