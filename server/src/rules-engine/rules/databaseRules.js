import { RESOURCE_TYPES } from '../constants.js';
import { pass, fail } from './helpers.js';

export const databaseRules = [
  {
    id: 'DB-001',
    title: 'Database is publicly accessible',
    appliesTo: RESOURCE_TYPES.DATABASE,
    severity: 'critical',
    description: 'The database endpoint can be reached from the public internet.',
    whyItMatters: 'A database reachable from anywhere can be attacked directly with password guessing and known exploits.',
    remediation: 'Set publicly accessible to false, place the database in a private subnet, and allow connections only from application servers.',
    evaluate: (db) =>
      db.publiclyAccessible ? fail(`publiclyAccessible is true for database "${db.name}"`) : pass('publiclyAccessible is false'),
  },
  {
    id: 'DB-002',
    title: 'Database encryption is disabled',
    appliesTo: RESOURCE_TYPES.DATABASE,
    severity: 'high',
    description: 'Data stored by the database (and its snapshots) is not encrypted at rest.',
    whyItMatters: 'Unencrypted storage or snapshots expose all records if the disks or backups are accessed.',
    remediation: 'Enable storage encryption. Most managed databases require creating an encrypted copy from a snapshot and switching to it.',
    evaluate: (db) =>
      db.encryptionEnabled ? pass('encryptionEnabled is true') : fail(`encryptionEnabled is false for database "${db.name}"`),
  },
  {
    id: 'DB-003',
    title: 'Database backups are disabled',
    appliesTo: RESOURCE_TYPES.DATABASE,
    severity: 'medium',
    description: 'Automated backups are turned off for the database.',
    whyItMatters: 'If data is deleted, corrupted or held to ransom, there is nothing to restore from.',
    remediation: 'Enable automated backups with a suitable retention period and test restoring from them regularly.',
    evaluate: (db) =>
      db.backupEnabled ? pass('backupEnabled is true') : fail(`backupEnabled is false for database "${db.name}"`),
  },
];
