import { RESOURCE_TYPES } from '../constants.js';
import { pass, fail } from './helpers.js';

export const storageRules = [
  {
    id: 'STO-001',
    title: 'Storage bucket allows public access',
    appliesTo: RESOURCE_TYPES.STORAGE_BUCKET,
    severity: 'critical',
    description: 'The bucket is configured so that anyone on the internet can read its contents.',
    whyItMatters: 'Public buckets are a common cause of data leaks because no login is needed to download the files.',
    remediation:
      'Turn on "block public access" for the bucket, remove public ACLs and policy statements that allow everyone, and share files with signed links or authenticated access instead.',
    evaluate: (bucket) =>
      bucket.publicAccess ? fail(`publicAccess is true for bucket "${bucket.name}"`) : pass('publicAccess is false'),
  },
  {
    id: 'STO-002',
    title: 'Storage bucket encryption is disabled',
    appliesTo: RESOURCE_TYPES.STORAGE_BUCKET,
    severity: 'high',
    description: 'Objects in the bucket are not encrypted at rest.',
    whyItMatters: 'Without encryption at rest, anyone who gets access to the underlying storage can read the data directly.',
    remediation: 'Enable default server-side encryption on the bucket (for example SSE-S3 or SSE-KMS) and re-encrypt existing objects.',
    evaluate: (bucket) =>
      bucket.encryptionEnabled ? pass('encryptionEnabled is true') : fail(`encryptionEnabled is false for bucket "${bucket.name}"`),
  },
  {
    id: 'STO-003',
    title: 'Storage bucket access logging is disabled',
    appliesTo: RESOURCE_TYPES.STORAGE_BUCKET,
    severity: 'low',
    description: 'Requests made to the bucket are not being recorded in an access log.',
    whyItMatters: 'Without access logs you cannot investigate who read or changed data after an incident.',
    remediation: 'Enable server access logging and send the logs to a separate, protected logging bucket.',
    evaluate: (bucket) =>
      bucket.loggingEnabled ? pass('loggingEnabled is true') : fail(`loggingEnabled is false for bucket "${bucket.name}"`),
  },
];
