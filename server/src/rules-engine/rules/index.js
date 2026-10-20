// The rule registry. To add a new check: create a rule object in one of the files
// in this folder and add it to the list below. Nothing else needs to change.
import { RESOURCE_TYPES, SEVERITIES } from '../constants.js';
import { storageRules } from './storageRules.js';
import { networkRules } from './networkRules.js';
import { iamRules } from './iamRules.js';
import { databaseRules } from './databaseRules.js';

const TEXT_FIELDS = ['id', 'title', 'appliesTo', 'severity', 'description', 'whyItMatters', 'remediation'];

function assertValidRule(rule) {
  for (const field of TEXT_FIELDS) {
    if (typeof rule[field] !== 'string' || rule[field].trim() === '') {
      throw new Error(`Rule ${rule.id ?? '(no id)'} is missing "${field}"`);
    }
  }
  if (typeof rule.evaluate !== 'function') throw new Error(`Rule ${rule.id} needs an evaluate() function`);
  if (!SEVERITIES[rule.severity]) throw new Error(`Rule ${rule.id} has an unknown severity "${rule.severity}"`);
  if (!Object.values(RESOURCE_TYPES).includes(rule.appliesTo)) {
    throw new Error(`Rule ${rule.id} applies to unknown resource type "${rule.appliesTo}"`);
  }
}

const allRules = [...storageRules, ...networkRules, ...iamRules, ...databaseRules];
const ids = new Set();
for (const rule of allRules) {
  assertValidRule(rule);
  if (ids.has(rule.id)) throw new Error(`Duplicate rule id ${rule.id}`);
  ids.add(rule.id);
}

export const rules = Object.freeze(allRules);

// Rule information without the functions, safe to send to the frontend.
export function getRuleCatalog() {
  return rules.map((r) => ({
    id: r.id,
    title: r.title,
    appliesTo: r.appliesTo,
    severity: r.severity,
    description: r.description,
    whyItMatters: r.whyItMatters,
    remediation: r.remediation,
  }));
}
