// Builds the CSV remediation report. Pure functions (no database, no libraries) so they are easy to test.

// Excel and Sheets treat cells that start with = + - @ as formulas. Prefixing a quote makes them plain text.
export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

const COLUMNS = [
  ['Severity', (f) => f.severity],
  ['Rule ID', (f) => f.ruleId],
  ['Rule title', (f) => f.title],
  ['Resource type', (f) => f.resourceType],
  ['Resource ID', (f) => f.resourceId],
  ['Resource name', (f) => f.resourceName],
  ['Evidence', (f) => f.evidence],
  ['Why it matters', (f) => f.whyItMatters],
  ['Suggested fix', (f) => f.remediation],
];

export function buildCsv(scan, findings) {
  const scanDate = new Date(scan.createdAt).toISOString();
  const header = ['Scan ID', 'Scan date (UTC)', ...COLUMNS.map(([name]) => name)];
  const lines = [header.map(csvCell).join(',')];
  for (const f of findings) {
    const row = [String(scan.id), scanDate, ...COLUMNS.map(([, get]) => get(f))];
    lines.push(row.map(csvCell).join(','));
  }
  // The BOM (\uFEFF) makes Excel open the file as UTF-8.
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
