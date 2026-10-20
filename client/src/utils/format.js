export const TYPE_LABELS = {
  storage_bucket: 'Storage bucket',
  security_group: 'Security group',
  iam_user: 'IAM user',
  iam_policy: 'IAM policy',
  database: 'Database',
};

export const SEVERITY_LABELS = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

export const formatDate = (iso) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export const formatScore = (score) => (score === null || score === undefined ? 'N/A' : `${score}%`);
