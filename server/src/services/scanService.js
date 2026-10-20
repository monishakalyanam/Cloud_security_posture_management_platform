// Runs one scan: validate -> evaluate rules -> save to MongoDB.
import { validateConfig } from '../rules-engine/validator.js';
import { evaluateResources } from '../rules-engine/engine.js';
import { SEVERITIES } from '../rules-engine/constants.js';
import { Scan } from '../models/Scan.js';
import { Resource } from '../models/Resource.js';
import { Finding } from '../models/Finding.js';
import { ApiError } from '../utils/ApiError.js';

export function validateOnly(config) {
  return validateConfig(config);
}

export async function runScan({ userId, config, sourceName, sourceType }) {
  const validation = validateConfig(config);
  if (!validation.valid) {
    throw new ApiError(422, 'The configuration file is not valid. Fix the listed problems and try again.', validation.errors);
  }

  const result = evaluateResources(validation.resources);

  const scan = await Scan.create({ user: userId, sourceName, sourceType, status: 'running', summary: result.summary });
  try {
    const resourceDocs = await Resource.insertMany(
      validation.resources.map((r) => ({
        scan: scan._id,
        user: userId,
        resourceId: r.resourceId,
        type: r.type,
        name: r.name,
        config: r.config,
      })),
    );
    const mongoIdByResourceId = new Map(resourceDocs.map((d) => [d.resourceId, d._id]));

    await Finding.insertMany(
      result.findings.map((f) => ({
        ...f,
        scan: scan._id,
        user: userId,
        resource: mongoIdByResourceId.get(f.resourceId),
        severityRank: SEVERITIES[f.severity].rank,
      })),
    );

    scan.status = 'completed';
    await scan.save();
    return scan;
  } catch (err) {
    // Standalone MongoDB has no transactions, so we clean up by hand if saving fails half-way.
    await Promise.all([
      Finding.deleteMany({ scan: scan._id }),
      Resource.deleteMany({ scan: scan._id }),
      Scan.deleteOne({ _id: scan._id }),
    ]);
    throw err;
  }
}
