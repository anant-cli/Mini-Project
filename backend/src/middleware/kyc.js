// Use after requireAuth. Blocks any action that should only be available to
// an identity-verified user (creating a listing, creating a booking).
// Admins are exempt since they aren't hosts or drivers themselves.
export const requireVerifiedIdentity = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (!req.user.id_verified) {
    return res.status(403).json({
      error: 'Please complete identity verification (ID photo + selfie) from your Account page before continuing.',
    });
  }
  next();
};

// Use after requireAuth. Blocks KYC submission (and anything else gated on
// it) until the account's email address has been confirmed via OTP —
// stops someone from verifying identity documents against an email
// address they don't actually control.
export const requireEmailVerified = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (!req.user.email_verified) {
    return res.status(403).json({
      error: 'Please verify your email address first — check your inbox for the verification code.',
    });
  }
  next();
};
