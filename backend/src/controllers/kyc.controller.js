import { z } from 'zod';
import {
  createKycSubmission, getLatestKycForUser, getPendingKycSubmissions,
  getKycSubmissionById, reviewKycSubmission,
} from '../models/kyc.model.js';
import { ApiError } from '../middleware/errorHandler.js';

// Base64 data URLs only (e.g. "data:image/jpeg;base64,...") — capped well
// under Express's json body limit (see server.js) so a couple of phone
// photos fit comfortably without needing a separate file-upload endpoint.
const dataUrlImage = z.string()
  .min(100)
  .max(4_000_000)
  .refine((v) => /^data:image\/(png|jpe?g|webp);base64,/.test(v), 'Must be a base64 image data URL');

const CONSENT_VERSION = '2026-09-v1';

const CONSENT_TYPE_BY_ROLE = {
  host: 'ownership_declaration',
  business_host: 'ownership_declaration',
  driver: 'own_vehicle_liability',
};

const submitSchema = z.object({
  id_document_image: dataUrlImage,
  selfie_image: dataUrlImage,
  consent: z.literal(true, { errorMap: () => ({ message: 'You must accept the consent statement to continue' }) }),
});

export const submitKyc = async (req, res, next) => {
  try {
    const consentType = CONSENT_TYPE_BY_ROLE[req.user.role];
    if (!consentType) throw new ApiError(400, 'Your account type does not require identity verification');
    if (req.user.kyc_status === 'pending') throw new ApiError(409, 'Your verification is already pending review');
    if (req.user.kyc_status === 'approved') throw new ApiError(409, 'Your identity is already verified');

    const data = submitSchema.parse(req.body);
    const submission = await createKycSubmission(req.user.user_id, {
      idDocumentImage: data.id_document_image,
      selfieImage: data.selfie_image,
      consentType,
      consentVersion: CONSENT_VERSION,
      consentIp: req.ip,
    });
    res.status(201).json({ submission });
  } catch (err) {
    next(err);
  }
};

export const myKycStatus = async (req, res, next) => {
  try {
    const latest = await getLatestKycForUser(req.user.user_id);
    res.json({
      kyc_status: req.user.kyc_status,
      id_verified: req.user.id_verified,
      latest_submission: latest || null,
      consent_type: CONSENT_TYPE_BY_ROLE[req.user.role] || null,
    });
  } catch (err) {
    next(err);
  }
};

export const adminPendingKyc = async (req, res, next) => {
  try {
    const submissions = await getPendingKycSubmissions();
    res.json({ submissions });
  } catch (err) {
    next(err);
  }
};

const reviewSchema = z.object({
  approve: z.boolean(),
  rejection_reason: z.string().max(500).optional(),
});

export const adminReviewKyc = async (req, res, next) => {
  try {
    const { approve, rejection_reason: rejectionReason } = reviewSchema.parse(req.body);
    const existing = await getKycSubmissionById(req.params.id);
    if (!existing) throw new ApiError(404, 'Submission not found');
    if (existing.status !== 'pending') throw new ApiError(409, 'This submission has already been reviewed');

    const submission = await reviewKycSubmission(req.params.id, {
      approve, rejectionReason, reviewerId: req.user.user_id,
    });
    res.json({ submission });
  } catch (err) {
    next(err);
  }
};
