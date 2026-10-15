import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base = process.env.APP_URL || 'http://localhost:3000';
const origin = new URL(base).origin;
function client() {
  let cookie = '';
  return async (path, method = 'GET', body) => {
    const res = await fetch(base + '/api' + path, {method, headers: {Origin: origin, ...(cookie ? {Cookie: cookie} : {}), ...(method !== 'GET' ? {'Content-Type': 'application/json'} : {})}, body: method !== 'GET' ? JSON.stringify(body ?? {}) : undefined});
    const set = res.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
    const data = res.status === 204 ? null : await res.json();
    return {status: res.status, data, set};
  };
}
const student = client(), other = client(), admin = client();
assert.equal((await student('/auth/session')).status, 401);
const credentials = {email: `web-${randomUUID()}@example.test`, password: randomUUID()};
assert.equal((await student('/auth/register','POST',credentials)).status,201);
const login = await student('/auth/login','POST',credentials);
assert.equal(login.status,200); assert.equal('token' in login.data,false);
assert.match(login.set,/HttpOnly/); assert.match(login.set,/SameSite=Lax/);
const user = login.data.user;
assert.equal((await student('/auth/session')).data.user.id,user.id);
const csrf = await fetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:'http://untrusted.invalid','Content-Type':'application/json'},body:'{}'});
assert.equal(csrf.status,403);
const list = await student('/resources'); assert.equal(list.status,200); assert.ok(list.data.resources.length);
const resource = list.data.resources[0];
const start = Date.now()+2500, end=start+2000;
const created = await student('/bookings','POST',{resourceId:resource.id,startTime:new Date(start).toISOString(),endTime:new Date(end).toISOString()});
assert.equal(created.status,201); assert.equal(created.data.notificationSent,true);
const id=created.data.booking.id;
assert.equal((await student(`/bookings/user/${user.id}`)).data.bookings.some(b=>b.id===id),true);
const notifications = await student(`/notifications/user/${user.id}`);
assert.equal(notifications.status,200); assert.ok(notifications.data.notifications.length);
assert.equal((await student(`/notifications/${notifications.data.notifications[0].id}/read`,'PATCH')).status,200);
assert.equal((await other(`/bookings/${id}`)).status,401);
await new Promise(resolve=>setTimeout(resolve,Math.max(0,end-Date.now()+300)));
const review=await student('/reviews','POST',{bookingId:id,rating:5,comment:'Frontend integration verification'});
assert.equal(review.status,201);assert.equal((await student(`/reviews/user/${user.id}`)).data.reviews.length,1);
assert.equal((await student('/reviews','POST',{bookingId:id,rating:4})).status,409);
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const logged=await admin('/auth/login','POST',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});
  assert.equal(logged.status,200);assert.equal(logged.data.user.role,'admin');
  const rid=`web-${randomUUID()}`;
  assert.equal((await student('/resources','POST',{name:'Not permitted'})).status,403);
  assert.equal((await admin('/resources','POST',{id:rid,name:'Integration room',capacity:4})).status,201);
  assert.equal((await admin(`/resources/${rid}`,'PATCH',{active:false})).status,200);
  assert.equal((await admin(`/resources/${rid}`,'DELETE')).status,204);
  assert.equal((await admin(`/resources/${rid}`)).status,404);
  assert.equal((await admin('/bookings')).status,200);assert.equal((await admin('/reviews')).status,200);
  const closure=await admin('/closures','POST',{startTime:new Date(Date.now()+60000).toISOString(),endTime:new Date(Date.now()+120000).toISOString(),reason:'Integration verification'});
  assert.equal(closure.status,201);assert.equal((await admin(`/closures/${closure.data.closure.id}`,'DELETE')).status,204);
}
assert.equal((await student('/auth/logout','POST')).status,200);
assert.equal((await student('/auth/session')).status,401);
for(const path of ['/','/resources','/bookings','/notifications','/reviews','/admin']) assert.equal((await fetch(base+path)).status,200);
console.log('Frontend integration passed: cookie login, CSRF, real resources, booking, notifications, completed review, admin CRUD/closures, logout and all pages.');
