const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AuthService, credentials } = require('../dist/auth');
const { randomUUID } = require('node:crypto');
const input = { email: 'student@example.test', password: randomUUID() };

test('UT-AUTH-01 validates and normalizes credentials', () => {
  assert.equal(credentials({ ...input, email: ' STUDENT@example.test ' }).email, input.email);
  for (const body of [null, {}, { ...input, password: 'short' }, { ...input, email: 'bad' }]) {
    assert.throws(() => credentials(body), { code: 'INVALID_INPUT' });
  }
});
test('UT-AUTH-02 registration hides password and prevents role escalation', async () => {
  const auth = new AuthService();
  const user = await auth.register({ ...input, role: 'admin' });
  assert.equal(user.role, 'student');
  assert.deepEqual(Object.keys(user).sort(), ['email', 'id', 'role']);
  await assert.rejects(auth.register(input), { code: 'EMAIL_ALREADY_EXISTS' });
});
test('UT-AUTH-03 concurrent duplicate registration has one winner', async () => {
  const auth = new AuthService();
  const results = await Promise.allSettled([auth.register(input), auth.register(input)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'EMAIL_ALREADY_EXISTS');
});
test('UT-AUTH-04 login rejects wrong password and unknown user', async () => {
  const auth = new AuthService(); await auth.register(input);
  await assert.rejects(auth.login({ ...input, password: randomUUID() }), { code: 'INVALID_CREDENTIALS' });
  await assert.rejects(auth.login({ ...input, email: 'unknown@example.test' }), { code: 'INVALID_CREDENTIALS' });
});
test('UT-AUTH-05 token works, rejects tampering and expires at boundary', async () => {
  let now = 1000;
  const auth = new AuthService(1, () => now); const user = await auth.register(input);
  const { token } = await auth.login(input);
  assert.deepEqual(auth.verify(token), user);
  assert.throws(() => auth.verify('0'.repeat(64)), { code: 'INVALID_TOKEN' });
  assert.throws(() => auth.verify(undefined), { code: 'INVALID_TOKEN' });
  now = 2000;
  assert.throws(() => auth.verify(token), { code: 'INVALID_TOKEN' });
});

test('admin provisioning permits admin login but never overwrites student', async () => {
 const auth = new AuthService();
 const adminInput = { email: 'admin@example.test', password: randomUUID() };
 const admin = await auth.provisionAdmin(adminInput);
 assert.equal(admin.role, 'admin');
 assert.deepEqual(Object.keys(admin).sort(), ['email', 'id', 'role']);
 const login = await auth.login(adminInput);
 assert.equal(login.user.role, 'admin'); assert.equal(auth.verify(login.token).role, 'admin');
 const student = await auth.register({ ...input, role: 'admin' }); assert.equal(student.role, 'student');
 await assert.rejects(auth.provisionAdmin(input), { code: 'EMAIL_ALREADY_EXISTS' });
 assert.equal((await auth.login(input)).user.role, 'student');
 await assert.rejects(auth.register(adminInput), { code: 'EMAIL_ALREADY_EXISTS' });
});
test('admin configuration requires valid paired credentials', () => {
 const { adminCredentials } = require('../dist/auth');
 assert.equal(adminCredentials({}), undefined);
 assert.equal(adminCredentials({ADMIN_EMAIL: ' ADMIN@example.test ', ADMIN_PASSWORD: input.password}).email, 'admin@example.test');
 for (const env of [{ADMIN_EMAIL:'admin@example.test'}, {ADMIN_PASSWORD:input.password}, {ADMIN_EMAIL:'', ADMIN_PASSWORD:''}, {ADMIN_EMAIL:'bad', ADMIN_PASSWORD:input.password}, {ADMIN_EMAIL:'admin@example.test', ADMIN_PASSWORD:'short'}]) assert.throws(()=>adminCredentials(env));
});
test('invalid admin startup exits before listen without logging credentials', () => {
 const { spawnSync } = require('node:child_process');
 const marker = randomUUID();
 const result = spawnSync(process.execPath, ['dist/index.js'], { cwd: require('node:path').join(__dirname, '..'), env: { ...process.env, ADMIN_EMAIL: '', ADMIN_PASSWORD: marker }, encoding: 'utf8' });
 assert.equal(result.status, 1);
 assert.doesNotMatch(result.stdout, /listening/);
 assert.equal(result.stderr.includes(marker), false);
});
