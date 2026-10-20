import mongoose from 'mongoose';
import { Scan } from '../models/Scan.js';
import { Resource } from '../models/Resource.js';
import { Finding } from '../models/Finding.js';
import { runScan, validateOnly } from '../services/scanService.js';
import { buildCsv } from '../services/reportCsv.js';
import { writePdfReport } from '../services/reportPdf.js';
import { RESOURCE_TYPES, SEVERITIES } from '../rules-engine/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';

const FINDING_SORT = { severityRank: -1, ruleId: 1, resourceId: 1 };

// Ownership check used by EVERY scan-related endpoint: the scan must belong to the logged-in user.
// A scan owned by someone else gives the same "not found" answer as one that does not exist.
async function getOwnedScan(req) {
  const { scanId } = req.params;
  if (!mongoose.isObjectIdOrHexString(scanId)) throw new ApiError(400, 'Invalid scan id.');
  const scan = await Scan.findOne({ _id: scanId, user: req.user.id });
  if (!scan) throw new ApiError(404, 'Scan not found.');
  return scan;
}

// Only accept plain strings from the query string (blocks ?search[$ne]=x style tricks).
const queryText = (value) => (typeof value === 'string' ? value.trim().slice(0, 100) : '');
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function searchClause(search, fields) {
  if (!search) return null;
  const pattern = new RegExp(escapeRegex(search), 'i');
  return { $or: fields.map((f) => ({ [f]: pattern })) };
}

export async function createScan(req, res) {
  const sourceName = queryText(req.body?.sourceName) || 'Untitled scan';
  const sourceType = req.body?.sourceType === 'sample' ? 'sample' : 'upload';
  const scan = await runScan({ userId: req.user.id, config: req.body?.config, sourceName, sourceType });
  ok(res, { scan }, 201);
}

export async function validateScan(req, res) {
  const result = validateOnly(req.body?.config);
  if (!result.valid) throw new ApiError(422, 'The configuration file is not valid.', result.errors);
  ok(res, { valid: true, resourceCount: result.resources.length });
}

export async function listScans(req, res) {
  const scans = await Scan.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100);
  ok(res, { scans });
}

export async function getScan(req, res) {
  ok(res, { scan: await getOwnedScan(req) });
}

export async function deleteScan(req, res) {
  const scan = await getOwnedScan(req);
  await Promise.all([
    Finding.deleteMany({ scan: scan._id, user: req.user.id }),
    Resource.deleteMany({ scan: scan._id, user: req.user.id }),
    Scan.deleteOne({ _id: scan._id, user: req.user.id }),
  ]);
  ok(res, { deleted: true });
}

export async function listFindings(req, res) {
  const scan = await getOwnedScan(req);
  const severity = queryText(req.query.severity);
  const type = queryText(req.query.type);
  if (severity && !Object.hasOwn(SEVERITIES, severity)) throw new ApiError(400, 'Unknown severity filter.');
  if (type && !Object.values(RESOURCE_TYPES).includes(type)) throw new ApiError(400, 'Unknown resource type filter.');

  const filter = { scan: scan._id, user: req.user.id };
  if (severity) filter.severity = severity;
  if (type) filter.resourceType = type;
  const search = searchClause(queryText(req.query.search), ['title', 'ruleId', 'resourceName', 'resourceId', 'evidence']);
  if (search) Object.assign(filter, search);

  const findings = await Finding.find(filter).sort(FINDING_SORT);
  ok(res, { findings });
}

export async function getFinding(req, res) {
  const scan = await getOwnedScan(req);
  if (!mongoose.isObjectIdOrHexString(req.params.findingId)) throw new ApiError(400, 'Invalid finding id.');
  const finding = await Finding.findOne({ _id: req.params.findingId, scan: scan._id, user: req.user.id });
  if (!finding) throw new ApiError(404, 'Finding not found.');
  ok(res, { finding });
}

export async function listResources(req, res) {
  const scan = await getOwnedScan(req);
  const type = queryText(req.query.type);
  if (type && !Object.values(RESOURCE_TYPES).includes(type)) throw new ApiError(400, 'Unknown resource type filter.');

  const filter = { scan: scan._id, user: req.user.id };
  if (type) filter.type = type;
  const search = searchClause(queryText(req.query.search), ['name', 'resourceId']);
  if (search) Object.assign(filter, search);

  const [resources, counts] = await Promise.all([
    Resource.find(filter).sort({ type: 1, name: 1 }),
    Finding.aggregate([
      { $match: { scan: scan._id, user: req.user.id } },
      { $group: { _id: '$resource', count: { $sum: 1 } } },
    ]),
  ]);
  const countById = new Map(counts.map((c) => [String(c._id), c.count]));
  const rows = resources.map((r) => ({ ...r.toJSON(), findingCount: countById.get(String(r._id)) || 0 }));
  ok(res, { resources: rows });
}

export async function downloadCsv(req, res) {
  const scan = await getOwnedScan(req);
  const findings = await Finding.find({ scan: scan._id, user: req.user.id }).sort(FINDING_SORT);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="cspm-report-${scan.id}.csv"`);
  res.send(buildCsv(scan, findings));
}

export async function downloadPdf(req, res) {
  const scan = await getOwnedScan(req);
  const findings = await Finding.find({ scan: scan._id, user: req.user.id }).sort(FINDING_SORT);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="cspm-report-${scan.id}.pdf"`);
  writePdfReport(res, scan, findings);
}

export async function dashboard(req, res) {
  const [totalScans, latestScan, recentScans] = await Promise.all([
    Scan.countDocuments({ user: req.user.id }),
    Scan.findOne({ user: req.user.id }).sort({ createdAt: -1 }),
    Scan.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(5),
  ]);
  const topFindings = latestScan
    ? await Finding.find({ scan: latestScan._id, user: req.user.id }).sort(FINDING_SORT).limit(5)
    : [];
  ok(res, { totalScans, latestScan, topFindings, recentScans });
}
