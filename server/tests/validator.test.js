import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateConfig } from '../src/rules-engine/validator.js';

const loadSample = (name) => JSON.parse(readFileSync(new URL(`../sample-data/${name}.json`, import.meta.url), 'utf8'));
const paths = (result) => result.errors.map((e) => e.path);
const goodBucket = { id: 'b1', name: 'b', publicAccess: false, encryptionEnabled: true, loggingEnabled: true };

test('both valid samples pass validation', () => {
  assert.equal(validateConfig(loadSample('secure')).valid, true);
  assert.equal(validateConfig(loadSample('insecure')).valid, true);
});

test('invalid sample reports each problem with a path', () => {
  const r = validateConfig(loadSample('invalid'));
  assert.equal(r.valid, false);
  assert.equal(r.resources.length, 0);
  const p = paths(r);
  for (const expected of [
    'storageBuckets[0].publicAccess',
    'storageBuckets[0].encryptionEnabled',
    'securityGroups[0].inboundRules[0].toPort',
    'securityGroups[0].inboundRules[0].ipv4Cidrs[0]',
    'iamUsers[0].id',
    'iamUsers[0].mfaEnabled',
    'databses',
  ]) {
    assert.ok(p.includes(expected), `expected an error for ${expected}, got: ${p.join(', ')}`);
  }
});

test('a missing required field is an error, never assumed secure', () => {
  const { encryptionEnabled, ...withoutEncryption } = goodBucket;
  const r = validateConfig({ storageBuckets: [withoutEncryption] });
  assert.equal(r.valid, false);
  assert.deepEqual(paths(r), ['storageBuckets[0].encryptionEnabled']);
});

test('booleans must be real booleans', () => {
  for (const bad of ['true', 'yes', 1, 0, null]) {
    const r = validateConfig({ storageBuckets: [{ ...goodBucket, publicAccess: bad }] });
    assert.equal(r.valid, false, `publicAccess=${JSON.stringify(bad)} must be rejected`);
  }
});

test('root must be an object, and at least one resource is required', () => {
  assert.equal(validateConfig([]).valid, false);
  assert.equal(validateConfig(null).valid, false);
  assert.equal(validateConfig('text').valid, false);
  assert.equal(validateConfig({}).valid, false);
  assert.equal(validateConfig({ storageBuckets: [] }).valid, false);
});

test('unknown top-level sections (typos) are rejected instead of silently ignored', () => {
  const r = validateConfig({ storageBuckets: [goodBucket], storageBucket: [] });
  assert.equal(r.valid, false);
  assert.ok(paths(r).includes('storageBucket'));
});

test('resource ids must be unique across the whole file', () => {
  const r = validateConfig({
    storageBuckets: [goodBucket],
    databases: [{ id: 'b1', name: 'd', engine: 'mysql', publiclyAccessible: false, encryptionEnabled: true, backupEnabled: true }],
  });
  assert.equal(r.valid, false);
  assert.ok(paths(r).includes('databases[0].id'));
});

test('ports and CIDRs are validated (IPv4 and IPv6)', () => {
  const sg = (rule) => ({ securityGroups: [{ id: 's', name: 's', inboundRules: [rule] }] });
  const base = { protocol: 'tcp', fromPort: 22, toPort: 22, ipv4Cidrs: [], ipv6Cidrs: [] };
  assert.equal(validateConfig(sg(base)).valid, true);
  assert.equal(validateConfig(sg({ ...base, toPort: 70000 })).valid, false);
  assert.equal(validateConfig(sg({ ...base, fromPort: 30, toPort: 20 })).valid, false);
  assert.equal(validateConfig(sg({ ...base, fromPort: '22' })).valid, false);
  assert.equal(validateConfig(sg({ ...base, ipv4Cidrs: ['10.0.0.0/33'] })).valid, false);
  assert.equal(validateConfig(sg({ ...base, ipv4Cidrs: ['not-a-cidr'] })).valid, false);
  assert.equal(validateConfig(sg({ ...base, ipv6Cidrs: ['::/129'] })).valid, false);
  assert.equal(validateConfig(sg({ ...base, ipv6Cidrs: ['::/0'] })).valid, true);
  assert.equal(validateConfig(sg({ protocol: 'tcp', fromPort: 22, toPort: 22 })).valid, false, 'needs at least one CIDR list');
  assert.equal(validateConfig(sg({ ...base, protocol: 'gre' })).valid, false);
});

test('normalisation: "all" becomes -1, single strings become arrays, unknown fields are dropped', () => {
  const r = validateConfig({
    securityGroups: [{ id: 's', name: 's', inboundRules: [{ protocol: 'ALL', ipv4Cidrs: ['0.0.0.0/0'] }], secretExtra: 'x' }],
    iamPolicies: [{ id: 'p', name: 'p', statements: [{ effect: 'Allow', actions: 's3:GetObject', resources: '*' }] }],
  });
  assert.equal(r.valid, true);
  const sg = r.resources.find((x) => x.type === 'security_group');
  assert.equal(sg.config.inboundRules[0].protocol, '-1');
  assert.equal('secretExtra' in sg.config, false);
  const pol = r.resources.find((x) => x.type === 'iam_policy');
  assert.deepEqual(pol.config.statements[0].actions, ['s3:GetObject']);
  assert.deepEqual(pol.config.statements[0].resources, ['*']);
});

test('IAM: mfaEnabled is required only when consoleAccess is true', () => {
  assert.equal(validateConfig({ iamUsers: [{ id: 'u', userName: 'u', consoleAccess: false }] }).valid, true);
  assert.equal(validateConfig({ iamUsers: [{ id: 'u', userName: 'u', consoleAccess: true }] }).valid, false);
});

test('more than 500 resources is rejected', () => {
  const many = Array.from({ length: 501 }, (_, i) => ({ ...goodBucket, id: `b${i}` }));
  assert.equal(validateConfig({ storageBuckets: many }).valid, false);
});
