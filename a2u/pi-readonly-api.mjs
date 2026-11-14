// KMON A2U Pi Platform API adapter (read-only).
// No payment creation, signing, submission, cancellation, or completion.
// Use ONLY on a trusted server; never expose PI_API_KEY to browsers.
const BASE = 'https://api.minepi.com/v2';
function safeId(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,256}$/.test(id)) throw new Error('Invalid payment ID');
  return id;
}
export function makePiReadOnlyApi({ apiKey, fetchImpl = fetch }) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('Missing server API key');
  if (typeof fetchImpl !== 'function') throw new Error('Missing fetch implementation');
  async function get(path) {
    const response = await fetchImpl(BASE + path, {
      method: 'GET',
      headers: { Authorization: 'Key ' + apiKey, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('Pi API request failed: HTTP ' + response.status);
    const value = await response.json();
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Unexpected Pi API response');
    return value;
  }
  return Object.freeze({
    async getPayment(id) { return get('/payments/' + encodeURIComponent(safeId(id))); },
    async getIncompleteServerPayments() {
      const result = await get('/payments/incomplete_server_payments');
      if (!Array.isArray(result.incomplete_server_payments))
        throw new Error('Unexpected incomplete payments response');
      return result.incomplete_server_payments;
    }
  });
}
