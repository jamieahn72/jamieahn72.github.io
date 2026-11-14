import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyA2UCompletion } from './verify-completion.mjs';
const expected={paymentId:'payment-1',uid:'user_1234',amount:0.01,txid:'tx-1',appWalletAddress:'GAPP',recipientWalletAddress:'GUSER'};
const payment={
 identifier:'payment-1',user_uid:'user_1234',amount:0.01,
 network:'Pi Testnet',direction:'app_to_user',from_address:'GAPP',to_address:'GUSER',
 transaction:{txid:'tx-1',verified:true},
 status:{developer_approved:true,transaction_verified:true,developer_completed:true,cancelled:false,user_cancelled:false}
};
test('accepts completed matching Testnet A2U',()=>assert.equal(verifyA2UCompletion(payment,expected),true));
for(const [name,change] of [
 ['wrong network',{network:'Pi Network'}],['wrong direction',{direction:'user_to_app'}],
 ['wrong recipient wallet',{to_address:'GOTHER'}],['wrong app wallet',{from_address:'GOTHER'}],
 ['wrong UID',{user_uid:'other'}],['wrong amount',{amount:0.02}],
 ['wrong payment ID',{identifier:'other'}],['unverified tx',{transaction:{txid:'tx-1',verified:false}}],
 ['cancelled',{status:{...payment.status,cancelled:true}}],
 ['incomplete',{status:{...payment.status,developer_completed:false}}]
]){
 test('rejects '+name,()=>assert.equal(verifyA2UCompletion({...payment,...change},expected),false));
}
