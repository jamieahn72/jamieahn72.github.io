import assert from 'node:assert/strict';
import test from 'node:test';
import { issueA2UApproval } from './approval-issuer.mjs';
const operator={authenticated:true,role:'a2u-operator',id:'admin_1234'};
const uid='recipient_1234';
function db() {
 const calls=[];
 return {calls,prepare(sql){return {bind(...args){return {async run(){calls.push({sql,args});return {meta:{changes:1}}}}}}}};
}
test('rejects missing authenticated operator',async()=>{
 const d=db();
 await assert.rejects(issueA2UApproval({db:d,operator:{id:'admin_1234'},uid,amount:0.01}),/Authenticated/);
 assert.equal(d.calls.length,0);
});
test('rejects incorrect role and amount',async()=>{
 const d=db();
 await assert.rejects(issueA2UApproval({db:d,operator:{...operator,role:'viewer'},uid,amount:0.01}),/Authenticated/);
 await assert.rejects(issueA2UApproval({db:d,operator,uid,amount:0.02}),/0.01/);
 assert.equal(d.calls.length,0);
});
test('creates five-minute, UID-bound approval with server-generated ID',async()=>{
 const d=db(),now=new Date('2026-11-14T10:00:00.000Z');
 const result=await issueA2UApproval({db:d,operator,uid,amount:0.01,now,randomUUID:()=> 'approval_123456'});
 assert.equal(result.expiresAt,'2026-11-14T10:05:00.000Z');
 assert.deepEqual(d.calls[0].args,['approval_123456',uid,operator.id,result.expiresAt]);
});
