// The rules engine: takes validated resources, runs every applicable rule, returns findings + summary.
import { RESOURCE_TYPES, SEVERITIES } from './constants.js';
import { rules as defaultRules } from './rules/index.js';
import { calculateScore } from './score.js';

// Severity policy: higher severity first, then rule id, then resource id (stable and easy to explain).
export function compareFindings(a, b) {
  return (
    SEVERITIES[b.severity].rank - SEVERITIES[a.severity].rank ||
    a.ruleId.localeCompare(b.ruleId) ||
    a.resourceId.localeCompare(b.resourceId)
  );
}

export function evaluateResources(resources, ruleSet = defaultRules) {
  let totalChecks = 0;
  let passedChecks = 0;
  const findings = [];

  for (const resource of resources) {
    for (const rule of ruleSet) {
      if (rule.appliesTo !== resource.type) continue;
      if (rule.isApplicable && !rule.isApplicable(resource.config)) continue; // not applicable: not counted

      const result = rule.evaluate(resource.config);
      if (!result || typeof result.passed !== 'boolean') {
        throw new Error(`Rule ${rule.id} returned an invalid result for resource ${resource.resourceId}`);
      }
      totalChecks += 1;
      if (result.passed) {
        passedChecks += 1;
        continue;
      }
      findings.push({
        ruleId: rule.id,
        title: rule.title,
        description: rule.description,
        whyItMatters: rule.whyItMatters,
        remediation: rule.remediation,
        severity: rule.severity,
        resourceId: resource.resourceId,
        resourceType: resource.type,
        resourceName: resource.name,
        evidence: result.evidence,
      });
    }
  }

  findings.sort(compareFindings);

  const findingsBySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) findingsBySeverity[f.severity] += 1;

  const resourcesByType = Object.fromEntries(Object.values(RESOURCE_TYPES).map((t) => [t, 0]));
  for (const r of resources) resourcesByType[r.type] += 1;

  return {
    findings,
    summary: {
      totalResources: resources.length,
      resourcesByType,
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      totalFindings: findings.length,
      findingsBySeverity,
      score: calculateScore(passedChecks, totalChecks),
    },
  };
}
