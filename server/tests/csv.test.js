import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, buildCsv } from '../src/services/reportCsv.js';

test('csvCell quotes commas, quotes and newlines', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
  assert.equal(csvCell(null), '');
});

test('csvCell neutralises spreadsheet formulas', () => {
  assert.equal(csvCell('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.equal(csvCell('@cmd'), "'@cmd");
  assert.equal(csvCell('+1'), "'+1");
});

test('buildCsv has a header row, one row per finding and a UTF-8 BOM', () => {
  const scan = { id: 'abc123', createdAt: '2026-09-30T10:00:00.000Z' };
  const findings = [
    {
      severity: 'critical', ruleId: 'STO-001', title: 'Storage bucket allows public access', resourceType: 'storage_bucket',
      resourceId: 'bkt-1', resourceName: 'my-bucket', evidence: 'publicAccess is true', whyItMatters: 'Leaks data, quickly',
      remediation: 'Block public access',
    },
  ];
  const csv = buildCsv(scan, findings);
  assert.ok(csv.startsWith('\uFEFF'));
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /Scan ID,Scan date \(UTC\),Severity,Rule ID/);
  assert.match(lines[1], /^abc123,2026-09-30T10:00:00.000Z,critical,STO-001,/);
  assert.ok(lines[1].includes('"Leaks data, quickly"'));
});
