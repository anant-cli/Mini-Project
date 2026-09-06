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
