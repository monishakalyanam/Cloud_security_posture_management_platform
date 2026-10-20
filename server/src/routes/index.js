import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import * as auth from '../controllers/authController.js';
import * as samples from '../controllers/sampleController.js';
import * as scans from '../controllers/scanController.js';

const router = Router();

// Public
router.post('/auth/register', h(auth.register));
router.post('/auth/login', h(auth.login));

// Everything below needs a valid JWT
router.use(requireAuth);
router.get('/auth/me', h(auth.me));

router.get('/samples', h(samples.listSamples));
router.get('/samples/:id', h(samples.getSample));
router.get('/rules', h(samples.listRules));

router.get('/dashboard', h(scans.dashboard));

router.get('/scans', h(scans.listScans));
router.post('/scans', h(scans.createScan));
router.post('/scans/validate', h(scans.validateScan));
router.get('/scans/:scanId', h(scans.getScan));
router.delete('/scans/:scanId', h(scans.deleteScan));
router.get('/scans/:scanId/findings', h(scans.listFindings));
router.get('/scans/:scanId/findings/:findingId', h(scans.getFinding));
router.get('/scans/:scanId/resources', h(scans.listResources));
router.get('/scans/:scanId/report.csv', h(scans.downloadCsv));
router.get('/scans/:scanId/report.pdf', h(scans.downloadPdf));

export default router;
