import { query, withTransaction } from '../config/db.js';

export const createKycSubmission = async (userId, data) => {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO kyc_submissions
        (user_id, id_document_image, selfie_image, consent_type, consent_version, consent_ip)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING kyc_id, user_id, consent_type, consent_version, consent_accepted_at, status, created_at`,
      [
        userId, data.idDocumentImage, data.selfieImage,
        data.consentType, data.consentVersion, data.consentIp || null,
      ]
    );
    await client.query(`UPDATE users SET kyc_status = 'pending' WHERE user_id = $1`, [userId]);
    return rows[0];
  });
};

export const getLatestKycForUser = async (userId) => {
  const { rows } = await query(
    `SELECT kyc_id, user_id, consent_type, consent_version, consent_accepted_at,
            status, rejection_reason, reviewed_at, created_at
     FROM kyc_submissions WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0];
};

export const getPendingKycSubmissions = async () => {
  const { rows } = await query(
    `SELECT k.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
     FROM kyc_submissions k
     JOIN users u ON u.user_id = k.user_id
     WHERE k.status = 'pending'
     ORDER BY k.created_at ASC`
  );
  return rows;
};

export const getKycSubmissionById = async (kycId) => {
  const { rows } = await query(`SELECT * FROM kyc_submissions WHERE kyc_id = $1`, [kycId]);
  return rows[0];
};

export const reviewKycSubmission = async (kycId, { approve, rejectionReason, reviewerId }) => {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE kyc_submissions
       SET status = $2, rejection_reason = $3, reviewed_by = $4, reviewed_at = now()
       WHERE kyc_id = $1 AND status = 'pending'
       RETURNING *`,
      [kycId, approve ? 'approved' : 'rejected', approve ? null : (rejectionReason || null), reviewerId]
    );
    const submission = rows[0];
    if (!submission) return null;

    await client.query(
      `UPDATE users SET id_verified = $2, kyc_status = $3 WHERE user_id = $1`,
      [submission.user_id, approve, approve ? 'approved' : 'rejected']
    );
    return submission;
  });
};
