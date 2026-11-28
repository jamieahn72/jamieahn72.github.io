import assert from 'node:assert/strict';
import test from 'node:test';
import { recordVerifiedWallet } from './verified-wallets.mjs';
const wallet='G'+'A'.repeat(55), appWallet='G'+'B'.repeat(55);
const expected={paymentId:'p-1',uid:'uid_1234',amount:0.01,txid:'tx-1',appWalletAddress:appWallet,recipientWalletAddress:wallet};
const payment={identifier:'p-1',user_uid:'uid_1234',amount:0.01,network:'Pi Testnet',direction:'app_to_user',
 from_address:appWallet,to_address:wallet,transaction:{txid:'tx-1',verified:true},
 status:{developer_approved:true,transaction_verified:true,developer_completed:true,cancelled:false,user_cancelled:false}};
function fakeDB() {
 const state={wallets:new Map(),writes:0};
 return {state,prepare(sql){return {bind(...args){return {async first(){
   if(sql.startsWith('SELECT id'))return {id:'payout-1',recipient_uid:'uid_1234',amount:'0.0100000',payment_id:'p-1',txid:'tx-1',status:'submitted'};
   if(sql.startsWith('SELECT recipient_wallet'))return state.wallets.get(args[0])??null;
   throw Error('Unexpected first');
 },async run(){
   if(!sql.startsWith('INSERT OR IGNORE'))throw Error('Unexpected run');
   state.writes++;
   const [w,uid,payoutId,paymentId,txid]=args;
   if(![...state.wallets.values()].some(x=>x.recipient_wallet===w||x.recipient_uid===uid||x.payment_id===paymentId||x.txid===txid))
     state.wallets.set(payoutId,{recipient_wallet:w,recipient_uid:uid,payout_id:payoutId,payment_id:paymentId,txid});
   return {meta:{changes:1}};
 }};}},async first(){if(sql.startsWith('SELECT COUNT'))return {total:state.wallets.size};throw Error('Unexpected count');}};}};
}
test('counts only verified Testnet A2U and is idempotent',async()=>{
 const db=fakeDB();
 const args={db,payment,expected,payoutId:'payout-1'};
 assert.deepEqual(await recordVerifiedWallet(args),{verifiedUniqueWallets:1,target:5,complete:false});
 assert.deepEqual(await recordVerifiedWallet(args),{verifiedUniqueWallets:1,target:5,complete:false});
});
test('rejects wrong recipient before database write',async()=>{
 const db=fakeDB();
 await assert.rejects(recordVerifiedWallet({db,payment:{...payment,to_address:'G'+'C'.repeat(55)},expected,payoutId:'payout-1'}),/not verified/);
 assert.equal(db.state.writes,0);
});
test('rejects unverified transactions before database write',async()=>{
 const db=fakeDB();
 await assert.rejects(recordVerifiedWallet({db,payment:{...payment,transaction:{txid:'tx-1',verified:false}},expected,payoutId:'payout-1'}),/not verified/);
 assert.equal(db.state.writes,0);
});
