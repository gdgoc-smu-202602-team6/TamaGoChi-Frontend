const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHttpClient, ApiError, apiErrorMessage } = require('../.expo/tests/services/api/http-client.js');
const { createAuthService } = require('../.expo/tests/services/api/auth-service.js');
const { validateEmail, validateNickname, validateNewPassword } = require('../.expo/tests/utils/auth-validation.js');

const user = { id: 'account-1', email: 'study@example.com', nickname: '공부냥' };
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });
function setup(handler, initialToken = null) {
  let token = initialToken;
  const calls = [];
  const store = { get: async () => token, set: async (value) => { token = value; }, remove: async () => { token = null; } };
  const client = createHttpClient({ baseUrl: 'https://api.example.com', fetcher: async (url, options) => {
    calls.push({ url, ...options });
    return handler(url, options);
  } });
  return { service: createAuthService(client, store), calls, store, token: () => token };
}

test('email and signup validation follow server rules without restricting email domains', () => {
  assert.equal(validateEmail(' study@example.com '), null);
  assert.ok(validateEmail('bad@'));
  assert.equal(validateNickname(' 🐱‍👤'.repeat(5).trim()), null);
  assert.equal(validateNickname('가'.repeat(10)), null);
  assert.ok(validateNickname('가'.repeat(11)));
  assert.ok(validateNickname('   '));
  assert.equal(validateNewPassword('Study12!'), null);
  assert.equal(validateNewPassword('correct horse battery 1'), null);
  for (const password of ['abc12!', 'abcdefgh', 'abcdefgh1', '한글문자비밀번호1!', 'a1!' + 'a'.repeat(126)]) assert.ok(validateNewPassword(password));
});

test('sign in persists only the header token after validating /users/me', async () => {
  const fixture = setup((url) => url.endsWith('/users/me') ? json(user) : json({ user: { name: 'ignored' } }, 200, { 'set-auth-token': 'secret-session' }));
  assert.deepEqual(await fixture.service.signIn(' study@example.com ', ' keep Password1! '), user);
  assert.equal(fixture.token(), 'secret-session');
  assert.equal(fixture.calls[1].headers.get('authorization'), 'Bearer secret-session');
  assert.equal(fixture.calls[0].credentials, 'omit');
  assert.deepEqual(JSON.parse(fixture.calls[0].body), { email: user.email, password: ' keep Password1! ' });
  assert.ok(fixture.calls.every((call) => !call.url.includes('secret') && !call.url.includes('Password')));
});

test('missing token and malformed account responses cannot create a session', async () => {
  const missing = setup(() => json({ token: 'untrusted-body-token' }));
  await assert.rejects(missing.service.signIn(user.email, 'Study12!'), { kind: 'response' });
  assert.equal(missing.token(), null);
  const malformed = setup((url) => url.endsWith('/users/me') ? json({ id: 'wrong' }) : json({}, 200, { 'set-auth-token': 'candidate' }));
  await assert.rejects(malformed.service.signIn(user.email, 'Study12!'), { kind: 'response' });
  assert.equal(malformed.token(), null);
});

test('failed token persistence never acknowledges a successful login', async () => {
  const fixture = setup((url) => url.endsWith('/users/me') ? json(user) : json({}, 200, { 'set-auth-token': 'candidate' }));
  fixture.store.set = async () => { throw new Error('device storage unavailable'); };
  await assert.rejects(fixture.service.signIn(user.email, 'Study12!'), { kind: 'storage' });
  assert.equal(fixture.token(), null);
});

test('restore with no token makes no network request; expired token is removed', async () => {
  const empty = setup(() => { throw new Error('should not call'); });
  assert.equal(await empty.service.restore(), null);
  assert.equal(empty.calls.length, 0);
  const expired = setup(() => json({ type: '/problems/unauthorized' }, 401), 'expired');
  assert.equal(await expired.service.restore(), null);
  assert.equal(expired.token(), null);
});

test('offline or server failure preserves the saved token for recovery', async () => {
  for (const response of [() => { throw new TypeError('network unavailable'); }, () => json({}, 503)]) {
    const fixture = setup(response, 'saved');
    await assert.rejects(fixture.service.restore(), ApiError);
    assert.equal(fixture.token(), 'saved');
  }
});

test('signup and verification requests never authenticate or persist passwords', async () => {
  const fixture = setup(() => json({}, 200, { 'set-auth-token': 'must-not-adopt' }));
  await fixture.service.signUp({ nickname: ' 공부냥 ', email: ' study@example.com ', password: 'Study12!' });
  assert.deepEqual(JSON.parse(fixture.calls[0].body), { name: user.nickname, email: user.email, password: 'Study12!' });
  await fixture.service.sendVerification(' study@example.com ');
  assert.equal(fixture.token(), null);
  assert.ok(fixture.calls[1].url.endsWith('/auth/send-verification-email'));
  assert.deepEqual(JSON.parse(fixture.calls[1].body), { email: user.email });
});

test('signout revokes remotely before clearing; a failed revoke preserves retry state', async () => {
  const fixture = setup(() => json({ success: true }), 'saved');
  await fixture.service.signOut();
  assert.equal(fixture.calls[0].headers.get('authorization'), 'Bearer saved');
  assert.equal(fixture.token(), null);
  const failed = setup(() => { throw new TypeError('offline'); }, 'saved');
  await assert.rejects(failed.service.signOut(), { kind: 'network' });
  assert.equal(failed.token(), 'saved');
  const expired = setup(() => json({}, 401), 'expired');
  await expired.service.signOut();
  assert.equal(expired.token(), null);
});

test('failed deletion is surfaced rather than claiming signout succeeded', async () => {
  const fixture = setup(() => json({ success: true }), 'saved');
  fixture.store.remove = async () => { throw new Error('cannot delete'); };
  await assert.rejects(fixture.service.signOut(), { kind: 'storage' });
  assert.equal(fixture.token(), 'saved');
});

test('concurrent restore and signout are serialized and cannot resurrect the session', async () => {
  let release;
  const waiting = new Promise((resolve) => { release = resolve; });
  const fixture = setup(async (url) => { if (url.endsWith('/users/me')) { await waiting; return json(user); } return json({ success: true }); }, 'saved');
  const restored = fixture.service.restore();
  const signedOut = fixture.service.signOut();
  release();
  assert.deepEqual(await restored, user);
  await signedOut;
  assert.equal(await fixture.service.restore(), null);
});

test('reset sends callback and token only in the intended JSON bodies', async () => {
  const fixture = setup(() => json({ status: true }));
  await fixture.service.requestPasswordReset(' study@example.com ', 'tamagochifrontend://reset-password');
  await fixture.service.resetPassword('reset-secret', 'NewPassword2!');
  assert.deepEqual(JSON.parse(fixture.calls[0].body), { email: user.email, redirectTo: 'tamagochifrontend://reset-password' });
  assert.deepEqual(JSON.parse(fixture.calls[1].body), { token: 'reset-secret', newPassword: 'NewPassword2!' });
  assert.equal(fixture.token(), null);
  assert.ok(!fixture.calls[1].url.includes('reset-secret'));
});

test('Problem Details and better-auth errors retain codes without echoing server details', async () => {
  const client = createHttpClient({ baseUrl: 'https://api.example.com', fetcher: async () => json({ type: '/problems/session-running', detail: 'sensitive server details' }, 409) });
  await assert.rejects(client.request('/test'), (error) => error.code === 'session-running' && !String(error).includes('sensitive'));
  const fixture = setup(() => json({ code: 'EMAIL_NOT_VERIFIED', message: 'private@example.com' }, 403));
  await assert.rejects(fixture.service.signIn(user.email, 'Study12!'), (error) => error.code === 'EMAIL_NOT_VERIFIED' && !apiErrorMessage(error).includes('private'));
  const wrong = setup(() => json({}, 401));
  await assert.rejects(wrong.service.signIn(user.email, 'wrong'), (error) => error.code === 'INVALID_EMAIL_OR_PASSWORD');
});

test('HTTP client handles empty bodies, non-JSON failures, malformed success and timeout', async () => {
  const empty = createHttpClient({ baseUrl: 'https://api.example.com/', fetcher: async () => new Response(null, { status: 204 }) });
  assert.equal((await empty.request('/test')).data, undefined);
  const failed = createHttpClient({ baseUrl: 'https://api.example.com', fetcher: async () => new Response('gateway', { status: 502 }) });
  await assert.rejects(failed.request('/test'), { kind: 'http', status: 502 });
  const malformed = createHttpClient({ baseUrl: 'https://api.example.com', fetcher: async () => new Response('html') });
  await assert.rejects(malformed.request('/test'), { kind: 'response' });
  const timeout = createHttpClient({ baseUrl: 'https://api.example.com', timeoutMs: 5, fetcher: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))) });
  await assert.rejects(timeout.request('/test'), { kind: 'timeout' });
});

test('invalid base URLs and external paths cannot receive credentials', async () => {
  let called = false;
  for (const baseUrl of ['file:///etc', 'https://user:pass@example.com', 'https://api.example.com?secret=1']) {
    await assert.rejects(createHttpClient({ baseUrl, fetcher: async () => { called = true; return json({}); } }).request('/test'), { kind: 'config' });
  }
  await assert.rejects(createHttpClient({ baseUrl: 'https://api.example.com' }).request('//other.example.com', { token: 'secret' }), { kind: 'config' });
  assert.equal(called, false);
});
