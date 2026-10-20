import { RESOURCE_TYPES } from '../constants.js';
import { findInternetOpenRules } from '../network.js';
import { pass, fail } from './helpers.js';

function describe(match) {
  const { index, rule, cidrs } = match;
  const what = rule.protocol === '-1' ? 'all protocols and ports' : `${rule.protocol} ${rule.fromPort}-${rule.toPort}`;
  return `Inbound rule #${index + 1} (${what}) is open to ${cidrs.join(' and ')}`;
}

// SSH and RDP are the same check with a different port, so one small factory builds both rules.
function makeExposureRule({ id, port, service }) {
  return {
    id,
    title: `${service} (port ${port}) is open to the internet`,
    appliesTo: RESOURCE_TYPES.SECURITY_GROUP,
    severity: 'high',
    description: `An inbound rule allows ${service} traffic (TCP port ${port}) from any IPv4 (0.0.0.0/0) or IPv6 (::/0) address.`,
    whyItMatters: 'Remote-administration ports that anyone can reach are constantly scanned and attacked with password guessing and exploits.',
    remediation: `Remove the open rule. Allow port ${port} only from a trusted IP range (for example your office or VPN CIDR), or use a bastion host or a managed session service instead.`,
    evaluate: (group) => {
      const matches = findInternetOpenRules(group.inboundRules, port);
      if (matches.length === 0) return pass(`No inbound rule exposes port ${port} to the internet`);
      return fail(matches.map(describe).join('; '));
    },
  };
}

export const networkRules = [
  makeExposureRule({ id: 'NET-001', port: 22, service: 'SSH' }),
  makeExposureRule({ id: 'NET-002', port: 3389, service: 'RDP' }),
];
