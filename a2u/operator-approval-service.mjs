// Trusted operator-only approval issuance, NOT deployed.
// Only the Cloudflare Access signed assertion header is used for identity.
// This function must be called behind a Cloudflare Access policy.
// No payout, wallet seed, or Pi API operations.
import { verifyAccessOperator } from './access-operator.mjs';
import { issueA2UApproval } from './approval-issuer.mjs';

export async function authorizeAndIssueApproval({
  request, env, uid, amount, fetchImpl, nowSeconds, now, randomUUID
}) {
  if (!(request instanceof Request)) throw new Error('Request required');
  if (!env?.A2U_DB || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD ||
      !env.ACCESS_OPERATOR_EMAIL)
    throw new Error('Operator approval service not configured');
  if (request.method !== 'POST') throw new Error('POST required');
  const assertion=request.headers.get('Cf-Access-Jwt-Assertion');
  if (!assertion) throw new Error('Cloudflare Access assertion required');
  // Identity must come from signed Access JWT, not request JSON, URL, or custom headers.
  const operator=await verifyAccessOperator({
    jwt:assertion,
    teamDomain:env.ACCESS_TEAM_DOMAIN,
    audience:env.ACCESS_AUD,
    allowedEmail:env.ACCESS_OPERATOR_EMAIL,
    ...(fetchImpl ? {fetchImpl} : {}),
    ...(nowSeconds === undefined ? {} : {nowSeconds})
  });
  return issueA2UApproval({
    db:env.A2U_DB,operator,uid,amount,
    ...(now ? {now} : {}),
    ...(randomUUID ? {randomUUID} : {})
  });
}
