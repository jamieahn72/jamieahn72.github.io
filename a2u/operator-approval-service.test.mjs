import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeAndIssueApproval } from './operator-approval-service.mjs';

const env={A2U_DB:{prepare(){throw new Error('DB should not be reached')}},ACCESS_TEAM_DOMAIN:'test.cloudflareaccess.com',ACCESS_AUD:'aud',ACCESS_OPERATOR_EMAIL:'admin@example.com'};
test('denies requests without Access JWT before DB use',async()=>{
 const request=new Request('https://example.com/approval',{method:'POST'});
 await assert.rejects(authorizeAndIssueApproval({request,env,uid:'user_1234',amount:0.01}),/Access assertion required/);
});
test('denies requests without configured Access policy',async()=>{
 const request=new Request('https://example.com/approval',{method:'POST'});
 await assert.rejects(authorizeAndIssueApproval({request,env:{A2U_DB:env.A2U_DB},uid:'user_1234',amount:0.01}),/not configured/);
});
test('denies GET approval attempts',async()=>{
 const request=new Request('https://example.com/approval');
 await assert.rejects(authorizeAndIssueApproval({request,env,uid:'user_1234',amount:0.01}),/POST required/);
});
test('rejects forged unsigned assertion before DB use',async()=>{
 const request=new Request('https://example.com/approval',{method:'POST',headers:{'Cf-Access-Jwt-Assertion':'forged.token.signature'}});
 await assert.rejects(authorizeAndIssueApproval({request,env,uid:'user_1234',amount:0.01}),/Malformed Access assertion|Unsupported Access assertion|Invalid Access assertion/);
});
