import assert from 'node:assert/strict';
import test from 'node:test';
import { payoutOnceSecure } from './payout-engine-secure.mjs';

const uid='recipient_1234';
const amount=0.01;
function store() {
 const s={claims:0,statuses:[],records:new Map()};
 return {
  state:s,
  async claimUniqueRecipient(u,a) {
   if(s.records.has(u)) return {created:false,record:s.records.get(u)};
   const record={id:'payout-'+(++s.claims),uid:u,amount:a};
   s.records.set(u,record); return {created:true,record};
  },
  async setStatus(id,status){s.statuses.push(status);},
  async setPaymentId(){},async setTxid(){}
 };
}
const pi={
 async getIncompleteServerPayments(){return [];},
 async createPayment(){return 'payment-1';},
 async submitPayment(){return 'tx-1';}
};
test('rejects untrusted approval without contacting Pi',async()=>{
 let called=false;
 await assert.rejects(payoutOnceSecure({pi:{...pi,createPayment:async()=>{called=true;}},store:store(),uid,amount,approval:{trusted:false,singleUse:true,consume:async()=>true}}),/Trusted approval/);
 assert.equal(called,false);
});
test('rejects consumed approval before claiming recipient',async()=>{
 const s=store();
 await assert.rejects(payoutOnceSecure({pi,store:s,uid,amount,approval:{trusted:true,singleUse:true,consume:async()=>false}}),/Approval denied/);
 assert.equal(s.state.claims,0);
});
test('does not mark unverified payout verified',async()=>{
 const s=store();
 const r=await payoutOnceSecure({pi,store:s,uid,amount,approval:{trusted:true,singleUse:true,consume:async()=>true}});
 assert.equal(r.status,'needs-reconciliation');
 assert.equal(s.state.statuses.includes('verified'),false);
});
test('blocks when incomplete payments exist',async()=>{
 const s=store();
 const r=await payoutOnceSecure({pi:{...pi,getIncompleteServerPayments:async()=>[{}]},store:s,uid,amount,approval:{trusted:true,singleUse:true,consume:async()=>true}});
 assert.equal(r.status,'blocked-incomplete');
});
