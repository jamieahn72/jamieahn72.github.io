import test from 'node:test';
import assert from 'node:assert/strict';
import { makeApprovalConsumer } from './approval-consumer.mjs';

// D1 contract simulation. These tests check application query arguments,
// not real SQLite concurrency or actual Cloudflare D1 behavior.
function fakeD1({ approvedBy='admin-1', recipientUid='user_1234', approvalId='approval_123456', expired=false }={}) {
  const state={consumed:false,calls:0,sql:''};
  const db={prepare(sql){
    state.sql=sql;
    return {bind(...args){
      return {async run(){
        state.calls++;
        const [id,operator,uid]=args;
        const accepted=!state.consumed&&!expired&&id===approvalId&&operator===approvedBy&&uid===recipientUid;
        if(accepted) state.consumed=true;
        return {meta:{changes:accepted?1:0}};
      }};
    }};
  }};
  return {db,state};
}
const ctx={operatorId:'admin-1',approvalId:'approval_123456'};
test('approval can be consumed only once',async()=>{
  const {db,state}=fakeD1();
  const approval=makeApprovalConsumer(db,ctx);
  assert.equal(await approval.consume({uid:'user_1234',amount:0.01}),true);
  assert.equal(await approval.consume({uid:'user_1234',amount:0.01}),false);
  assert.equal(state.calls,2);
  assert.match(state.sql,/consumed_at IS NULL/);
  assert.match(state.sql,/expires_at >/);
});
test('wrong UID and amount never consume',async()=>{
  const {db,state}=fakeD1();
  const approval=makeApprovalConsumer(db,ctx);
  assert.equal(await approval.consume({uid:'another_user',amount:0.01}),false);
  assert.equal(await approval.consume({uid:'user_1234',amount:0.02}),false);
  assert.equal(state.consumed,false);
});
test('expired approval fails closed',async()=>{
  const {db}=fakeD1({expired:true});
  assert.equal(await makeApprovalConsumer(db,ctx).consume({uid:'user_1234',amount:0.01}),false);
});
test('invalid server-side context rejected',()=>{
  const {db}=fakeD1();
  assert.throws(()=>makeApprovalConsumer(db,{operatorId:'admin-1',approvalId:'x'}),/Invalid trusted approval/);
});
