import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rules, getRuleCatalog } from '../src/rules-engine/rules/index.js';
import { evaluateResources } from '../src/rules-engine/engine.js';
import { validateConfig } from '../src/rules-engine/validator.js';
import { SEVERITIES } from '../src/rules-engine/constants.js';

const rule = (id) => rules.find((r) => r.id === id);
const loadSample = (name) => JSON.parse(readFileSync(new URL(`../sample-data/${name}.json`, import.meta.url), 'utf8'));
const inbound = (over) => ({ protocol: 'tcp', fromPort: 22, toPort: 22, ipv4Cidrs: [], ipv6Cidrs: [], ...over });
const group = (...rulesList) => ({ name: 'sg', inboundRules: rulesList });

test('rule catalog: 10 rules, unique ids, every rule has all required parts', () => {
  assert.equal(rules.length, 10);
  assert.equal(new Set(rules.map((r) => r.id)).size, 10);
  for (const r of rules) {
    assert.match(r.id, /^[A-Z]{2,3}-\d{3}$/);
    assert.equal(typeof r.evaluate, 'function');
    assert.ok(r.remediation.length > 20, `${r.id} needs remediation advice`);
    assert.ok(SEVERITIES[r.severity], `${r.id} has a valid severity`);
  }
  assert.equal(getRuleCatalog().some((r) => 'evaluate' in r), false);
});

test('STO-001 public bucket', () => {
  assert.equal(rule('STO-001').evaluate({ name: 'b', publicAccess: true }).passed, false);
  assert.equal(rule('STO-001').evaluate({ name: 'b', publicAccess: false }).passed, true);
});

test('STO-002 encryption and STO-003 logging', () => {
  assert.equal(rule('STO-002').evaluate({ name: 'b', encryptionEnabled: false }).passed, false);
  assert.equal(rule('STO-002').evaluate({ name: 'b', encryptionEnabled: true }).passed, true);
  assert.equal(rule('STO-003').evaluate({ name: 'b', loggingEnabled: false }).passed, false);
  assert.equal(rule('STO-003').evaluate({ name: 'b', loggingEnabled: true }).passed, true);
});

test('NET-001 SSH: IPv4, IPv6-only, port ranges and all-traffic rules fail', () => {
  const ssh = rule('NET-001');
  assert.equal(ssh.evaluate(group(inbound({ ipv4Cidrs: ['0.0.0.0/0'] }))).passed, false);
  assert.equal(ssh.evaluate(group(inbound({ ipv6Cidrs: ['::/0'] }))).passed, false, 'IPv6-only exposure must be caught');
  assert.equal(ssh.evaluate(group(inbound({ fromPort: 20, toPort: 30, ipv4Cidrs: ['0.0.0.0/0'] }))).passed, false);
  assert.equal(ssh.evaluate(group({ protocol: '-1', fromPort: 0, toPort: 65535, ipv4Cidrs: ['0.0.0.0/0'], ipv6Cidrs: [] })).passed, false);
});

test('NET-001 SSH: restricted, other-port and UDP rules pass', () => {
  const ssh = rule('NET-001');
  assert.equal(ssh.evaluate(group(inbound({ ipv4Cidrs: ['10.0.0.0/8'] }))).passed, true);
  assert.equal(ssh.evaluate(group(inbound({ fromPort: 2222, toPort: 2222, ipv4Cidrs: ['0.0.0.0/0'] }))).passed, true);
  assert.equal(ssh.evaluate(group(inbound({ protocol: 'udp', ipv4Cidrs: ['0.0.0.0/0'] }))).passed, true);
  assert.equal(ssh.evaluate(group()).passed, true, 'a group with no inbound rules exposes nothing');
});

test('NET-002 RDP mirrors SSH on port 3389', () => {
  const rdp = rule('NET-002');
  assert.equal(rdp.evaluate(group(inbound({ fromPort: 3389, toPort: 3389, ipv6Cidrs: ['::/0'] }))).passed, false);
  assert.equal(rdp.evaluate(group(inbound({ fromPort: 3389, toPort: 3389, ipv4Cidrs: ['192.168.0.0/16'] }))).passed, true);
  assert.equal(rdp.evaluate(group(inbound({ fromPort: 22, toPort: 22, ipv4Cidrs: ['0.0.0.0/0'] }))).passed, true);
});

test('IAM-001 wildcard policy', () => {
  const iam = rule('IAM-001');
  const stmt = (effect, actions, resources) => ({ effect, actions, resources });
  assert.equal(iam.evaluate({ statements: [stmt('Allow', ['*'], ['*'])] }).passed, false);
  assert.equal(iam.evaluate({ statements: [stmt('Allow', ['s3:GetObject'], ['*']), stmt('Allow', ['*'], ['*'])] }).passed, false);
  assert.equal(iam.evaluate({ statements: [stmt('Allow', ['s3:*'], ['*'])] }).passed, true, 'partial wildcards are not flagged (documented)');
  assert.equal(iam.evaluate({ statements: [stmt('Deny', ['*'], ['*'])] }).passed, true, 'Deny statements are safe');
});

test('IAM-002 MFA applies only to console users', () => {
  const mfa = rule('IAM-002');
  assert.equal(mfa.isApplicable({ consoleAccess: false }), false);
  assert.equal(mfa.isApplicable({ consoleAccess: true }), true);
  assert.equal(mfa.evaluate({ userName: 'u', consoleAccess: true, mfaEnabled: false }).passed, false);
  assert.equal(mfa.evaluate({ userName: 'u', consoleAccess: true, mfaEnabled: true }).passed, true);
});

test('DB-001/002/003', () => {
  assert.equal(rule('DB-001').evaluate({ name: 'd', publiclyAccessible: true }).passed, false);
  assert.equal(rule('DB-001').evaluate({ name: 'd', publiclyAccessible: false }).passed, true);
  assert.equal(rule('DB-002').evaluate({ name: 'd', encryptionEnabled: false }).passed, false);
  assert.equal(rule('DB-002').evaluate({ name: 'd', encryptionEnabled: true }).passed, true);
  assert.equal(rule('DB-003').evaluate({ name: 'd', backupEnabled: false }).passed, false);
  assert.equal(rule('DB-003').evaluate({ name: 'd', backupEnabled: true }).passed, true);
});

test('engine on the secure sample: no findings, 100%', () => {
  const v = validateConfig(loadSample('secure'));
  assert.equal(v.valid, true);
  const { findings, summary } = evaluateResources(v.resources);
  assert.equal(findings.length, 0);
  assert.equal(summary.totalResources, 8);
  assert.equal(summary.totalChecks, 16);
  assert.equal(summary.passedChecks, 16);
  assert.equal(summary.score, 100);
});

test('engine on the insecure sample: exact counts and severity ordering', () => {
  const v = validateConfig(loadSample('insecure'));
  assert.equal(v.valid, true);
  const { findings, summary } = evaluateResources(v.resources);
  assert.equal(summary.totalResources, 13);
  assert.equal(summary.totalChecks, 25);
  assert.equal(summary.passedChecks, 11);
  assert.equal(summary.failedChecks, 14);
  assert.equal(summary.score, 44);
  assert.deepEqual(summary.findingsBySeverity, { critical: 3, high: 7, medium: 2, low: 2 });
  assert.equal(findings.length, 14);
  for (let i = 1; i < findings.length; i += 1) {
    assert.ok(SEVERITIES[findings[i - 1].severity].rank >= SEVERITIES[findings[i].severity].rank, 'findings are sorted by severity');
  }
  assert.equal(findings[0].severity, 'critical');
  const publicBucket = findings.find((f) => f.ruleId === 'STO-001');
  assert.equal(publicBucket.resourceId, 'bkt-public-assets');
  assert.match(publicBucket.evidence, /publicAccess is true/);
});

test('score is null (N/A) when no check is applicable', () => {
  const v = validateConfig({ iamUsers: [{ id: 'u1', userName: 'bot', consoleAccess: false }] });
  assert.equal(v.valid, true);
  const { summary } = evaluateResources(v.resources);
  assert.equal(summary.totalChecks, 0);
  assert.equal(summary.score, null);
});
