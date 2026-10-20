import { readFile } from 'node:fs/promises';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';
import { getRuleCatalog } from '../rules-engine/rules/index.js';

// A fixed whitelist of file names, so a request can never read any other file.
const SAMPLES = {
  secure: { file: 'secure.json', name: 'Secure sample', description: 'A well-configured environment (expected result: no findings).' },
  insecure: { file: 'insecure.json', name: 'Insecure sample', description: 'A misconfigured environment that triggers every rule.' },
  invalid: { file: 'invalid.json', name: 'Invalid sample', description: 'A broken file for demonstrating validation errors.' },
};

export async function listSamples(req, res) {
  ok(res, Object.entries(SAMPLES).map(([id, s]) => ({ id, name: s.name, description: s.description })));
}

export async function getSample(req, res) {
  const sample = Object.hasOwn(SAMPLES, req.params.id) ? SAMPLES[req.params.id] : null;
  if (!sample) throw new ApiError(404, 'Sample not found');
  const content = await readFile(new URL(`../../sample-data/${sample.file}`, import.meta.url), 'utf8');
  ok(res, { id: req.params.id, name: sample.name, content });
}

export async function listRules(req, res) {
  ok(res, getRuleCatalog());
}
