import test from 'node:test';
import assert from 'node:assert/strict';
import { makePiReadOnlyApi } from './pi-readonly-api.mjs';
test('read-only incomplete payments request uses server API key', async () => {
 let called=0;
 const api=makePiReadOnlyApi({apiKey:'fake-server-key',fetchImpl:async (url,options)=>{
  called++;
  assert.equal(url,'https://api.minepi.com/v2/payments/incomplete_server_payments');
  assert.equal(options.method,'GET');
  assert.equal(options.headers.Authorization,'Key fake-server-key');
  return {ok:true,json:async()=>({incomplete_server_payments:[]})};
 }});
 assert.deepEqual(await api.getIncompleteServerPayments(),[]);
 assert.equal(called,1);
 assert.equal('createPayment' in api,false);
 assert.equal('submitPayment' in api,false);
});
test('invalid payment ID is rejected before network call',async()=>{
 const api=makePiReadOnlyApi({apiKey:'fake',fetchImpl:async()=>{throw Error('called')}});
 await assert.rejects(api.getPayment('../wrong'),/Invalid payment ID/);
});
test('bad server response fails closed',async()=>{
 const api=makePiReadOnlyApi({apiKey:'fake',fetchImpl:async()=>({ok:true,json:async()=>({})})});
 await assert.rejects(api.getIncompleteServerPayments(),/Unexpected incomplete/);
});
test('HTTP failures do not leak credentials',async()=>{
 const api=makePiReadOnlyApi({apiKey:'secret-not-for-logs',fetchImpl:async()=>({ok:false,status:401})});
 await assert.rejects(api.getIncompleteServerPayments(),e=>!e.message.includes('secret-not-for-logs') && /HTTP 401/.test(e.message));
});
