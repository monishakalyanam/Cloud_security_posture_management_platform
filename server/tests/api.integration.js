// End-to-end check of the real API. It needs the server AND MongoDB to be running:
//   Terminal 1:  npm run dev        Terminal 2:  npm run test:api
// It creates two throw-away users and one scan pair, then deletes what it can.
const BASE = process.env.API_URL || 'http://localhost:5000/api';
let passed = 0;
let failed = 0;

function check(name, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

async function call(method, path, { token, body, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (raw) return res;
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const stamp = Date.now();
const userA = { name: 'Test A', email: `a.${stamp}@example.com`, password: 'Passw0rdA1' };
const userB = { name: 'Test B', email: `b.${stamp}@example.com`, password: 'Passw0rdB2' };

async function main() {
  console.log(`Testing ${BASE}\n`);

  console.log('Health');
  const health = await call('GET', '/health');
  check('server is reachable', health.status === 200);

  console.log('\nRegistration and login');
  let r = await call('POST', '/auth/register', { body: { ...userA, password: 'short' } });
  check('weak password is rejected (400)', r.status === 400);
  r = await call('POST', '/auth/register', { body: { ...userA, email: 'not-an-email' } });
  check('invalid email is rejected (400)', r.status === 400);
  r = await call('POST', '/auth/register', { body: userA });
  check('register succeeds (201) and returns a token', r.status === 201 && Boolean(r.json?.data?.token));
  check('password hash is never returned', !JSON.stringify(r.json).includes('passwordHash') && !JSON.stringify(r.json).includes(userA.password));
  r = await call('POST', '/auth/register', { body: userA });
  check('duplicate email is rejected (409)', r.status === 409);
  r = await call('POST', '/auth/login', { body: { email: userA.email, password: 'WrongPass1' } });
  check('wrong password is rejected (401)', r.status === 401);
  r = await call('POST', '/auth/login', { body: { email: userA.email, password: userA.password } });
  check('login succeeds', r.status === 200 && Boolean(r.json?.data?.token));
  const tokenA = r.json.data.token;

  console.log('\nProtected routes');
  r = await call('GET', '/scans');
  check('no token -> 401', r.status === 401);
  r = await call('GET', '/scans', { token: 'garbage.token.value' });
  check('bad token -> 401', r.status === 401);
  r = await call('GET', '/auth/me', { token: tokenA });
  check('/auth/me returns the user', r.status === 200 && r.json.data.user.email === userA.email);

  console.log('\nSamples and validation');
  r = await call('GET', '/samples/insecure', { token: tokenA });
  check('insecure sample is served', r.status === 200);
  const insecure = JSON.parse(r.json.data.content);
  r = await call('GET', '/samples/secure', { token: tokenA });
  const secure = JSON.parse(r.json.data.content);
  r = await call('GET', '/samples/invalid', { token: tokenA });
  const invalid = JSON.parse(r.json.data.content);
  r = await call('GET', '/samples/..%2F..%2F.env', { token: tokenA });
  check('sample names cannot be used to read other files (404)', r.status === 404);
  r = await call('POST', '/scans/validate', { token: tokenA, body: { config: invalid } });
  check('invalid sample -> 422 with a list of problems', r.status === 422 && Array.isArray(r.json?.error?.details) && r.json.error.details.length >= 6);
  r = await call('POST', '/scans', { token: tokenA, body: { config: invalid } });
  check('scanning an invalid file is refused (422)', r.status === 422);
  r = await call('GET', '/scans', { token: tokenA });
  check('a refused scan saves nothing', r.json.data.scans.length === 0);

  console.log('\nScanning and persistence');
  r = await call('POST', '/scans', { token: tokenA, body: { config: insecure, sourceName: 'Insecure sample', sourceType: 'sample' } });
  check('insecure scan is created (201)', r.status === 201);
  const scan = r.json.data.scan;
  check('score is 44 (11 of 25 checks passed)', scan.summary.score === 44 && scan.summary.passedChecks === 11 && scan.summary.totalChecks === 25);
  check('14 findings: 3 critical, 7 high, 2 medium, 2 low',
    scan.summary.totalFindings === 14 &&
      scan.summary.findingsBySeverity.critical === 3 && scan.summary.findingsBySeverity.high === 7 &&
      scan.summary.findingsBySeverity.medium === 2 && scan.summary.findingsBySeverity.low === 2);
  r = await call('GET', `/scans/${scan.id}/findings`, { token: tokenA });
  const findings = r.json.data.findings;
  check('14 findings are stored in MongoDB, critical first', findings.length === 14 && findings[0].severity === 'critical');
  r = await call('GET', `/scans/${scan.id}/findings?severity=critical`, { token: tokenA });
  check('severity filter works', r.json.data.findings.length === 3);
  r = await call('GET', `/scans/${scan.id}/findings?search=public`, { token: tokenA });
  check('search filter works', r.json.data.findings.length >= 1);
  r = await call('GET', `/scans/${scan.id}/findings?severity=banana`, { token: tokenA });
  check('unknown filter value -> 400', r.status === 400);
  r = await call('GET', `/scans/${scan.id}/resources`, { token: tokenA });
  check('13 resources are stored', r.json.data.resources.length === 13);
  const bucketFinding = findings.find((f) => f.ruleId === 'STO-001');
  r = await call('GET', `/scans/${scan.id}/findings/${bucketFinding.id}`, { token: tokenA });
  check('finding detail includes evidence and remediation', r.status === 200 && Boolean(r.json.data.finding.evidence) && Boolean(r.json.data.finding.remediation));

  r = await call('POST', '/scans', { token: tokenA, body: { config: secure, sourceName: 'Secure sample', sourceType: 'sample' } });
  const secureScan = r.json.data.scan;
  check('secure scan scores 100 with no findings', secureScan.summary.score === 100 && secureScan.summary.totalFindings === 0);
  r = await call('GET', '/dashboard', { token: tokenA });
  check('dashboard shows the latest scan', r.json.data.latestScan.id === secureScan.id && r.json.data.totalScans === 2);
  r = await call('GET', '/scans', { token: tokenA });
  check('history lists both scans, newest first', r.json.data.scans.length === 2 && r.json.data.scans[0].id === secureScan.id);

  console.log('\nReports');
  let res = await call('GET', `/scans/${scan.id}/report.csv`, { token: tokenA, raw: true });
  const csv = await res.text();
  check('CSV download works', res.status === 200 && (res.headers.get('content-type') || '').includes('text/csv'));
  check('CSV contains all findings', csv.includes('STO-001') && csv.trim().split('\r\n').length === 15);
  res = await call('GET', `/scans/${scan.id}/report.pdf`, { token: tokenA, raw: true });
  const pdf = Buffer.from(await res.arrayBuffer());
  check('PDF download works and is a real PDF', res.status === 200 && pdf.subarray(0, 4).toString() === '%PDF' && pdf.length > 1000);

  console.log("\nUser B must not reach user A's data");
  r = await call('POST', '/auth/register', { body: userB });
  const tokenB = r.json.data.token;
  const forbidden = [
    ['scan details', 'GET', `/scans/${scan.id}`],
    ['findings list', 'GET', `/scans/${scan.id}/findings`],
    ['finding detail', 'GET', `/scans/${scan.id}/findings/${bucketFinding.id}`],
    ['resources list', 'GET', `/scans/${scan.id}/resources`],
    ['CSV report', 'GET', `/scans/${scan.id}/report.csv`],
    ['PDF report', 'GET', `/scans/${scan.id}/report.pdf`],
    ['delete', 'DELETE', `/scans/${scan.id}`],
  ];
  for (const [label, method, path] of forbidden) {
    res = await call(method, path, { token: tokenB, raw: true });
    check(`B cannot access A's ${label} (404)`, res.status === 404);
  }
  r = await call('GET', '/scans', { token: tokenB });
  check("B's history is empty", r.json.data.scans.length === 0);
  r = await call('GET', '/dashboard', { token: tokenB });
  check("B's dashboard shows no scans", r.json.data.totalScans === 0 && r.json.data.latestScan === null);
  r = await call('GET', `/scans/${scan.id}`, { token: tokenA });
  check("A's scan is still intact after B's delete attempt", r.status === 200);

  console.log('\nInput limits and errors');
  r = await call('GET', '/scans/not-an-id', { token: tokenA });
  check('malformed id -> 400', r.status === 400);
  r = await call('POST', '/scans', { token: tokenA, body: { config: { filler: 'x'.repeat(2 * 1024 * 1024) } } });
  check('body over 1 MB -> 413', r.status === 413);
  r = await call('GET', '/nope', { token: tokenA });
  check('unknown route -> 404 JSON', r.status === 404 && r.json?.success === false);

  console.log('\nCleanup');
  r = await call('DELETE', `/scans/${scan.id}`, { token: tokenA });
  check('A can delete their own scan', r.status === 200);
  r = await call('GET', `/scans/${scan.id}/findings`, { token: tokenA });
  check('deleted scan is gone (404)', r.status === 404);
  await call('DELETE', `/scans/${secureScan.id}`, { token: tokenA });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nCould not run the checks. Is the server running (npm run dev) and MongoDB started?\n', err.message);
  process.exit(1);
});
