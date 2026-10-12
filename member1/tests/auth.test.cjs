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
