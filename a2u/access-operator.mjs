// Cloudflare Access JWT verification for a future operator-only A2U route.
// NOT deployed. Use Cloudflare Access at the edge AND verify the assertion here.
// Never accept email, role or "authenticated" from request JSON.
function b64url(input) {
  const normalized=input.replace(/-/g,'+').replace(/_/g,'/');
  const binary=atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'='));
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
function jsonPart(value) { return JSON.parse(new TextDecoder().decode(b64url(value))); }
export async function verifyAccessOperator({
  jwt, teamDomain, audience, allowedEmail, fetchImpl=fetch, nowSeconds=Math.floor(Date.now()/1000)
}) {
  if (typeof jwt!=='string' || jwt.length>8192 || jwt.split('.').length!==3)
    throw new Error('Invalid Access assertion');
  if (typeof teamDomain!=='string' || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(teamDomain))
    throw new Error('Invalid Access team domain');
  if (typeof audience!=='string' || !audience || typeof allowedEmail!=='string' || !allowedEmail)
    throw new Error('Missing Access policy configuration');
  const [head,body,signature]=jwt.split('.');
  let header,payload;
  try { header=jsonPart(head); payload=jsonPart(body); } catch { throw new Error('Malformed Access assertion'); }
  if (header.alg!=='RS256' || typeof header.kid!=='string' || !header.kid)
    throw new Error('Unsupported Access assertion');
  const issuer='https://'+teamDomain;
  if (payload.iss!==issuer || !(Array.isArray(payload.aud)?payload.aud.includes(audience):payload.aud===audience) ||
      typeof payload.exp!=='number' || payload.exp<=nowSeconds ||
      typeof payload.iat!=='number' || payload.iat>nowSeconds+60 ||
      (typeof payload.nbf==='number' && payload.nbf>nowSeconds) ||
      typeof payload.email!=='string' || payload.email.toLowerCase()!==allowedEmail.toLowerCase())
    throw new Error('Access policy mismatch');
  const response=await fetchImpl(issuer+'/cdn-cgi/access/certs',{method:'GET',redirect:'error'});
  if (!response.ok) throw new Error('Access certificate fetch failed');
  const certs=await response.json();
  const jwk=certs?.keys?.find(k=>k.kid===header.kid && k.kty==='RSA' && (!k.alg || k.alg==='RS256') && (!k.use || k.use==='sig'));
  if (!jwk) throw new Error('Unknown Access signing key');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const signedBytes=new TextEncoder().encode(head+'.'+body);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64url(signature),signedBytes))
    throw new Error('Invalid Access signature');
  return Object.freeze({authenticated:true,role:'a2u-operator',id:payload.email.toLowerCase(),email:payload.email.toLowerCase()});
}
