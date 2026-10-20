// Security-check score = passed applicable checks / total evaluated applicable checks * 100.
// Returns null (shown as "N/A") when nothing was applicable. This is NOT a CIS or NIST compliance score.
export function calculateScore(passedChecks, totalChecks) {
  if (!totalChecks) return null;
  return Math.round((passedChecks / totalChecks) * 1000) / 10; // one decimal place
}
