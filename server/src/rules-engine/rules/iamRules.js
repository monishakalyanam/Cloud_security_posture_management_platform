import { RESOURCE_TYPES } from '../constants.js';
import { pass, fail } from './helpers.js';

export const iamRules = [
  {
    id: 'IAM-001',
    title: 'IAM policy allows all actions on all resources',
    appliesTo: RESOURCE_TYPES.IAM_POLICY,
    severity: 'critical',
    description:
      'An Allow statement uses the wildcard "*" for both actions and resources (full administrator access). Partial wildcards such as "s3:*" are not flagged by this project rule.',
    whyItMatters: 'Whoever holds this policy can do anything in the account, so one leaked credential can lead to a full compromise.',
    remediation: 'Replace the wildcards with the specific actions and resource ARNs that are really needed (least privilege).',
    evaluate: (policy) => {
      const bad = [];
      policy.statements.forEach((st, i) => {
        if (st.effect === 'Allow' && st.actions.includes('*') && st.resources.includes('*')) bad.push(i + 1);
      });
      if (bad.length > 0) return fail(`Statement ${bad.join(', ')} allows actions "*" on resources "*"`);
      return pass('No Allow statement combines wildcard actions with wildcard resources');
    },
  },
  {
    id: 'IAM-002',
    title: 'Console user has no MFA',
    appliesTo: RESOURCE_TYPES.IAM_USER,
    severity: 'high',
    description: 'An IAM user can sign in to the management console but multi-factor authentication (MFA) is not enabled.',
    whyItMatters: 'A stolen or guessed password is enough to log in when MFA is off.',
    remediation: 'Enable MFA (authenticator app or hardware key) for the user, or remove console access if the user does not need it.',
    // Users without console access are "not applicable", so they are not counted in the score.
    isApplicable: (user) => user.consoleAccess === true,
    evaluate: (user) =>
      user.mfaEnabled === true
        ? pass('consoleAccess is true and mfaEnabled is true')
        : fail(`User "${user.userName}" has consoleAccess true but mfaEnabled is false`),
  },
];
