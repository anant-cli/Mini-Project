import jwt from 'jsonwebtoken';

export const signToken = (user) =>
  jwt.sign(
    { sub: user.user_id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);
