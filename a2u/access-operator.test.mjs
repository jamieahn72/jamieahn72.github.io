import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { verifyAccessOperator } from './access-operator.mjs';
const domain='kmon-test.cloudflareaccess.com',audience='test-aud',email='admin@example.com',nowSeconds=1800000000;
function b64(value){return Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');}
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'test-key',alg:'RS256',use:'sig'};
function token(overrides={}) {
 const head=b64({alg:'RS256',kid:'test-key'});
 const body=b64({iss:'https://'+domain,aud:audience,email,iat:nowSeconds-20,exp:nowSeconds+100,...overrides});
 const signature=createSign('RSA-SHA256').update(head+'.'+body).end().sign(privateKey).toString('base64url');
 return head+'.'+body+'.'+signature;
}
const fetchImpl=async()=>({ok:true,json:async()=>({keys:[jwk]})});
const base={teamDomain:domain,audience,allowedEmail:email,nowSeconds,fetchImpl};
test('valid signed Cloudflare Access assertion authorizes operator',async()=>{
 const operator=await verifyAccessOperator({...base,jwt:token()});
 assert.equal(operator.role,'a2u-operator');assert.equal(operator.authenticated,true);
});
test('wrong email denied',async()=>assert.rejects(verifyAccessOperator({...base,jwt:token({email:'stranger@example.com'})}),/policy mismatch/));
test('expired token denied',async()=>assert.rejects(verifyAccessOperator({...base,jwt:token({exp:nowSeconds-1})}),/policy mismatch/));
test('wrong audience denied',async()=>assert.rejects(verifyAccessOperator({...base,jwt:token({aud:'other'})}),/policy mismatch/));
test('tampered signature denied',async()=>{
 const jwt=token();const parts=jwt.split('.');parts[2]=b64('invalid');
 await assert.rejects(verifyAccessOperator({...base,jwt:parts.join('.')}),/signature/);
});
test('untrusted Access domain rejected',async()=>assert.rejects(verifyAccessOperator({...base,jwt:token(),teamDomain:'evil.example.com'}),/team domain/));
