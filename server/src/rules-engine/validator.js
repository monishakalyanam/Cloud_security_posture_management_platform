// Validates the uploaded mock-cloud JSON and turns it into a clean list of resources.
// Rule of thumb: a missing or wrongly-typed field is an ERROR. We never guess that it is "secure".
import { MAX_RESOURCES, RESOURCE_TYPES } from './constants.js';
import { isValidCidr } from './network.js';

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const PROTOCOLS = ['tcp', 'udp', 'icmp', 'icmpv6', '-1', 'all'];

function readString(obj, field, path, add, { required = true, max = 200 } = {}) {
  const value = obj[field];
  if (value === undefined || value === null) {
    if (required) add(`${path}.${field}`, 'is required');
    return undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    add(`${path}.${field}`, 'must be a non-empty text value');
    return undefined;
  }
  if (value.length > max) {
    add(`${path}.${field}`, `must be at most ${max} characters`);
    return undefined;
  }
  return value.trim();
}

function readBoolean(obj, field, path, add, { required = true } = {}) {
  const value = obj[field];
  if (value === undefined || value === null) {
    if (required) add(`${path}.${field}`, 'is required (must be true or false)');
    return undefined;
  }
  if (typeof value !== 'boolean') {
    add(`${path}.${field}`, 'must be true or false (a boolean, not text or a number)');
    return undefined;
  }
  return value;
}

function readPort(obj, field, path, add) {
  const value = obj[field];
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    add(`${path}.${field}`, 'is required and must be a whole number between 0 and 65535');
    return undefined;
  }
  return value;
}

function readCidrList(obj, field, family, path, add) {
  const value = obj[field];
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    add(`${path}.${field}`, 'must be an array of CIDR strings');
    return [];
  }
  const example = family === 4 ? '10.0.0.0/8' : '2001:db8::/32';
  const clean = [];
  value.forEach((entry, i) => {
    if (isValidCidr(entry, family)) clean.push(entry);
    else add(`${path}.${field}[${i}]`, `${JSON.stringify(entry)} is not a valid IPv${family} CIDR (example: ${example})`);
  });
  return clean;
}

// Accepts "s3:GetObject" or ["s3:GetObject", "s3:PutObject"] and always returns an array.
function readStringList(obj, field, path, add) {
  const value = obj[field];
  const list = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(list) || list.length === 0 || list.some((x) => typeof x !== 'string' || x.trim() === '')) {
    add(`${path}.${field}`, 'is required and must be a text value or a non-empty array of text values');
    return undefined;
  }
  return list.map((x) => x.trim());
}

function normalizeBucket(item, path, add) {
  return {
    name: readString(item, 'name', path, add),
    publicAccess: readBoolean(item, 'publicAccess', path, add),
    encryptionEnabled: readBoolean(item, 'encryptionEnabled', path, add),
    loggingEnabled: readBoolean(item, 'loggingEnabled', path, add),
  };
}

function normalizeInboundRule(rule, path, add) {
  let protocol = readString(rule, 'protocol', path, add);
  if (protocol !== undefined) {
    protocol = protocol.toLowerCase();
    if (!PROTOCOLS.includes(protocol)) {
      add(`${path}.protocol`, `must be one of: ${PROTOCOLS.join(', ')}`);
      protocol = undefined;
    } else if (protocol === 'all') {
      protocol = '-1';
    }
  }
  let fromPort;
  let toPort;
  if (protocol === '-1') {
    fromPort = 0;
    toPort = 65535;
  } else if (protocol === 'tcp' || protocol === 'udp') {
    fromPort = readPort(rule, 'fromPort', path, add);
    toPort = readPort(rule, 'toPort', path, add);
    if (fromPort !== undefined && toPort !== undefined && fromPort > toPort) {
      add(`${path}.fromPort`, 'must not be greater than toPort');
    }
  }
  const ipv4Cidrs = readCidrList(rule, 'ipv4Cidrs', 4, path, add);
  const ipv6Cidrs = readCidrList(rule, 'ipv6Cidrs', 6, path, add);
  if (rule.ipv4Cidrs === undefined && rule.ipv6Cidrs === undefined) {
    add(path, 'must contain ipv4Cidrs and/or ipv6Cidrs (an empty list [] is allowed)');
  }
  return { protocol, fromPort, toPort, ipv4Cidrs, ipv6Cidrs };
}

function normalizeSecurityGroup(item, path, add) {
  const name = readString(item, 'name', path, add);
  const inboundRules = [];
  if (!Array.isArray(item.inboundRules)) {
    add(`${path}.inboundRules`, 'is required and must be an array (use [] for a group with no inbound rules)');
  } else {
    item.inboundRules.forEach((rule, i) => {
      const rulePath = `${path}.inboundRules[${i}]`;
      if (!isPlainObject(rule)) add(rulePath, 'must be an object');
      else inboundRules.push(normalizeInboundRule(rule, rulePath, add));
    });
  }
  return { name, inboundRules };
}

function normalizeIamUser(item, path, add) {
  const userName = readString(item, 'userName', path, add);
  const consoleAccess = readBoolean(item, 'consoleAccess', path, add);
  // MFA only matters when the user can sign in to the console, so only then is it required.
  const mfa = readBoolean(item, 'mfaEnabled', path, add, { required: consoleAccess === true });
  return { userName, consoleAccess, mfaEnabled: mfa === undefined ? null : mfa };
}

function normalizeIamPolicy(item, path, add) {
  const name = readString(item, 'name', path, add);
  const statements = [];
  if (!Array.isArray(item.statements) || item.statements.length === 0) {
    add(`${path}.statements`, 'is required and must be a non-empty array');
  } else {
    item.statements.forEach((st, i) => {
      const sp = `${path}.statements[${i}]`;
      if (!isPlainObject(st)) return add(sp, 'must be an object');
      const effect = st.effect;
      if (effect !== 'Allow' && effect !== 'Deny') add(`${sp}.effect`, 'is required and must be "Allow" or "Deny"');
      const actions = readStringList(st, 'actions', sp, add);
      const resources = readStringList(st, 'resources', sp, add);
      statements.push({ effect, actions, resources });
    });
  }
  return { name, statements };
}

function normalizeDatabase(item, path, add) {
  return {
    name: readString(item, 'name', path, add),
    engine: readString(item, 'engine', path, add, { max: 50 }),
    publiclyAccessible: readBoolean(item, 'publiclyAccessible', path, add),
    encryptionEnabled: readBoolean(item, 'encryptionEnabled', path, add),
    backupEnabled: readBoolean(item, 'backupEnabled', path, add),
  };
}

// Top-level JSON key -> how to read that kind of resource.
export const COLLECTIONS = {
  storageBuckets: { type: RESOURCE_TYPES.STORAGE_BUCKET, normalize: normalizeBucket, displayName: (c) => c.name },
  securityGroups: { type: RESOURCE_TYPES.SECURITY_GROUP, normalize: normalizeSecurityGroup, displayName: (c) => c.name },
  iamUsers: { type: RESOURCE_TYPES.IAM_USER, normalize: normalizeIamUser, displayName: (c) => c.userName },
  iamPolicies: { type: RESOURCE_TYPES.IAM_POLICY, normalize: normalizeIamPolicy, displayName: (c) => c.name },
  databases: { type: RESOURCE_TYPES.DATABASE, normalize: normalizeDatabase, displayName: (c) => c.name },
};

/**
 * @returns {{ valid: boolean, errors: {path: string, message: string}[], resources: {resourceId, type, name, config}[] }}
 */
export function validateConfig(input) {
  const errors = [];
  const add = (path, message) => errors.push({ path, message });

  if (!isPlainObject(input)) {
    add('(root)', 'The file must contain a JSON object such as {"storageBuckets": [...]}');
    return { valid: false, errors, resources: [] };
  }

  const allowed = ['metadata', ...Object.keys(COLLECTIONS)];
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) {
      add(key, `is not a recognised section (possible typo). Allowed sections: ${allowed.join(', ')}`);
    }
  }
  if (input.metadata !== undefined && !isPlainObject(input.metadata)) add('metadata', 'must be an object');

  const resources = [];
  const seenIds = new Map();
  let count = 0;

  for (const [key, spec] of Object.entries(COLLECTIONS)) {
    const list = input[key];
    if (list === undefined) continue;
    if (!Array.isArray(list)) {
      add(key, 'must be an array');
      continue;
    }
    list.forEach((item, index) => {
      count += 1;
      const path = `${key}[${index}]`;
      if (!isPlainObject(item)) return add(path, 'must be an object');
      const before = errors.length;
      const id = readString(item, 'id', path, add, { max: 100 });
      if (id !== undefined) {
        if (seenIds.has(id)) add(`${path}.id`, `"${id}" is already used at ${seenIds.get(id)}; ids must be unique`);
        else seenIds.set(id, path);
      }
      const config = spec.normalize(item, path, add);
      if (errors.length === before) resources.push({ resourceId: id, type: spec.type, name: spec.displayName(config), config });
    });
  }

  if (count === 0 && errors.length === 0) {
    add('(root)', 'No resources found. Add at least one item to a section such as "storageBuckets".');
  }
  if (count > MAX_RESOURCES) add('(root)', `Too many resources (${count}). The limit is ${MAX_RESOURCES} per scan.`);

  const valid = errors.length === 0;
  return { valid, errors: errors.slice(0, 100), resources: valid ? resources : [] };
}
