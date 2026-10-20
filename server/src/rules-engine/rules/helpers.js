// Every rule's evaluate() must return { passed: boolean, evidence: string }.
export const pass = (evidence) => ({ passed: true, evidence });
export const fail = (evidence) => ({ passed: false, evidence });
