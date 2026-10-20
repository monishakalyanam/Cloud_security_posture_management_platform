// Shared constants for the rules engine. No external libraries are used in this folder.

export const RESOURCE_TYPES = Object.freeze({
  STORAGE_BUCKET: 'storage_bucket',
  SECURITY_GROUP: 'security_group',
  IAM_USER: 'iam_user',
  IAM_POLICY: 'iam_policy',
  DATABASE: 'database',
});

// Severity policy (see docs/SCHEMA.md). "rank" is only used to sort findings.
export const SEVERITIES = Object.freeze({
  critical: { label: 'Critical', rank: 4 },
  high: { label: 'High', rank: 3 },
  medium: { label: 'Medium', rank: 2 },
  low: { label: 'Low', rank: 1 },
});

export const MAX_RESOURCES = 500;
