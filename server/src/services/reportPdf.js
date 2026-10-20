import PDFDocument from 'pdfkit';
import { SEVERITIES } from '../rules-engine/constants.js';

const COLORS = { critical: '#a3162f', high: '#c2410c', medium: '#a16207', low: '#1d4e89' };
const TYPE_LABELS = {
  storage_bucket: 'Storage bucket',
  security_group: 'Security group',
  iam_user: 'IAM user',
  iam_policy: 'IAM policy',
  database: 'Database',
};

export function writePdfReport(stream, scan, findings) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: { Title: 'Cloud Security Posture Report', Author: 'CSPM student project' },
  });
  doc.pipe(stream);
  const s = scan.summary;

  doc.font('Helvetica-Bold').fontSize(20).fillColor('#10202e').text('Cloud Security Posture - Remediation Report');
  doc.moveDown(0.5).font('Helvetica').fontSize(10).fillColor('#444444');
  doc.text(`Source: ${scan.sourceName} (${scan.sourceType})`);
  doc.text(`Scan date: ${new Date(scan.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC`);
  doc.text(`Scan ID: ${scan.id}`);

  doc.moveDown().font('Helvetica-Bold').fontSize(13).fillColor('#10202e').text('Summary');
  doc.font('Helvetica').fontSize(10).fillColor('#111111');
  doc.text(`Resources scanned: ${s.totalResources}`);
  doc.text(`Applicable checks evaluated: ${s.totalChecks} (passed ${s.passedChecks}, failed ${s.failedChecks})`);
  doc.text(`Security-check score: ${s.score === null ? 'N/A (no applicable checks)' : `${s.score}%`}`);
  const sev = s.findingsBySeverity;
  doc.text(`Findings: ${s.totalFindings} (critical ${sev.critical}, high ${sev.high}, medium ${sev.medium}, low ${sev.low})`);
  doc.moveDown(0.5).fontSize(8.5).fillColor('#555555').text(
    'Score = passed applicable checks / total evaluated applicable checks x 100. It is a project security-check score, not proof of CIS or NIST compliance. ' +
      'Severity is a fixed rating per rule, not a measure of real exploitability. The input was a mock JSON configuration; no live cloud account was accessed.',
  );

  doc.moveDown().font('Helvetica-Bold').fontSize(13).fillColor('#10202e').text('Findings (highest severity first)');

  if (findings.length === 0) {
    doc.moveDown(0.5).font('Helvetica').fontSize(10).fillColor('#111111').text('No findings. All applicable checks passed.');
  }

  const field = (label, value) => {
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111111').text(`${label}: `, { continued: true });
    doc.font('Helvetica').text(String(value));
  };

  findings.forEach((f, i) => {
    if (doc.y > 640) doc.addPage();
    doc.moveDown(0.8);
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(COLORS[f.severity])
      .text(`${i + 1}. [${SEVERITIES[f.severity].label.toUpperCase()}] ${f.ruleId} - ${f.title}`);
    field('Resource', `${f.resourceName} (${f.resourceId}, ${TYPE_LABELS[f.resourceType] || f.resourceType})`);
    field('Evidence', f.evidence);
    field('Why it matters', f.whyItMatters);
    field('Suggested fix', f.remediation);
  });

  doc.end();
}
