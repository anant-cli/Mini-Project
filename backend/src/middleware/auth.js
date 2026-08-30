import { verifyToken } from '../utils/jwt.js';
import { findUserById } from '../models/user.model.js';

export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  try {
    const decoded = verifyToken(token);
    const user = await findUserById(decoded.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.is_suspended) return res.status(403).json({ error: 'Your account has been suspended' });
    req.user = { user_id: user.user_id, role: user.role, email: user.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
