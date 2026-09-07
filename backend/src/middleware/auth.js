import { verifyToken } from '../utils/jwt.js';
import { findUserById } from '../models/user.model.js';

export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const user = await findUserById(decoded.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.is_suspended) return res.status(403).json({ error: 'Your account has been suspended' });
    req.user = {
      user_id: user.user_id, role: user.role, email: user.email,
      id_verified: user.id_verified, kyc_status: user.kyc_status,
      email_verified: user.email_verified,
    };
    next();
  } catch (err) {
    // A DB/query error here (e.g. a column added by a migration that
    // hasn't been applied yet) is NOT the same thing as a bad token —
    // let it surface as a real 500 via errorHandler instead of silently
    // logging the user out, which used to hide exactly this class of bug.
    next(err);
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
