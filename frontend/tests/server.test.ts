import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi, SESSION_COOKIE } from '../lib/server';
const token = 'a'.repeat(64);
const user = { id: 'u1', email: 'a@example.com', role: 'student' };
const req = (path: string, method = 'GET', body?: string, headers = {}) => new Request(`http://localhost:3000/api/${path}`, { method, headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', ...headers }, body });
const mock = (fn: (url: URL, init?: RequestInit) => Promise<Response>) => fn as typeof fetch;
test('login hides token and sets bounded secure HttpOnly session', async () => {
 const response = await handleApi(req('auth/login','POST','{}'), {env:{COOKIE_SECURE:'true'},fetch:mock(async(url) => {assert.equal(url.href,'http://localhost:3001/auth/login'); return Response.json({token,expiresIn:999999,user});})});
 assert.deepEqual(await response.json(),{user}); assert.match(response.headers.get('set-cookie')!,/HttpOnly; SameSite=Lax; Max-Age=86400; Secure/); assert.equal(response.headers.get('cache-control'),'no-store');
});
test('session uses cookie bearer and upstream verification', async () => {
 const response = await handleApi(req('auth/session','GET',undefined,{cookie:`${SESSION_COOKIE}=${token}`,authorization:'injected'}), {fetch:mock(async(url,init) => {assert.equal(url.pathname,'/auth/verify');assert.equal(init?.method,'POST');assert.equal(new Headers(init?.headers).get('authorization'),`Bearer ${token}`);return Response.json({valid:true,user});})}); assert.deepEqual(await response.json(),{user});
});
test('cross origin, invalid JSON, oversized body blocked before transport', async () => {
 let calls=0; const fetch=mock(async()=>{calls++;return Response.json({});});
 assert.equal((await handleApi(req('auth/login','POST','{}',{origin:'https://evil.example'}),{fetch})).status,403);
 assert.equal((await handleApi(req('auth/login','POST','invalid'),{fetch})).status,400);
 assert.equal((await handleApi(req('auth/login','POST',JSON.stringify({x:'a'.repeat(8192)})),{fetch})).status,413); assert.equal(calls,0);
});
test('private routes require token; internal notification creation blocked',async()=>{
 assert.equal((await handleApi(req('bookings'))).status,401);assert.equal((await handleApi(req('notifications','POST','{}'))).status,404);
});
test('authenticated backend enforces ownership; fixed upstream destination',async()=>{
 const r=await handleApi(req('bookings/user/other','GET',undefined,{cookie:`${SESSION_COOKIE}=${token}`}),{fetch:mock(async(url)=>{assert.equal(url.href,'http://localhost:3004/bookings/user/other');return Response.json({error:'FORBIDDEN'},{status:403});})});assert.equal(r.status,403);
});
test('upstream malformed JSON and transport errors are safe 503',async()=>{
 for(const fetch of [mock(async()=>new Response('private trace')),mock(async()=>{throw Error('private');})]){const r=await handleApi(req('resources'),{fetch});assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'SERVICE_UNAVAILABLE'});}
});
test('logout clears cookie and numeric rate retry is preserved',async()=>{
 const r=await handleApi(req('auth/logout','POST','{}'));assert.match(r.headers.get('set-cookie')!,/Max-Age=0/);
 const limited=await handleApi(req('auth/login','POST','{}'),{fetch:mock(async()=>Response.json({error:'TOO_MANY_REQUESTS'},{status:429,headers:{'retry-after':'60'}}))});assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'60');
});
test('standalone mutations use configured public origin, never forwarded headers', async () => {
 const request = (origin: string) => new Request('http://0.0.0.0:3000/api/auth/logout', {method:'POST',headers:{origin,'content-type':'application/json','x-forwarded-host':'evil.example','x-forwarded-proto':'https'},body:'{}'});
 const env = { NODE_ENV:'production',APP_ORIGIN:'http://localhost:3300' };
 assert.equal((await handleApi(request('http://localhost:3300'),{env})).status,200);
 assert.equal((await handleApi(request('http://0.0.0.0:3000'),{env})).status,403);
 assert.equal((await handleApi(request('https://evil.example'),{env})).status,403);
});
test('production missing or malformed public origin fails closed',async()=>{
 for(const APP_ORIGIN of [undefined,'bad','file:///tmp/a','http://user:password@localhost:3300','http://localhost:3300/path','http://localhost:3300?query=1','http://localhost:3300#fragment','']){
  const r=await handleApi(req('auth/logout','POST','{}'),{env:{NODE_ENV:'production',APP_ORIGIN}});
  assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'INVALID_CONFIG'});
 }
});
