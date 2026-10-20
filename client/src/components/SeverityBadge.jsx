import { SEVERITY_LABELS } from '../utils/format.js';

export default function SeverityBadge({ severity }) {
  return <span className={`badge sev-${severity}`}>{SEVERITY_LABELS[severity] || severity}</span>;
}
