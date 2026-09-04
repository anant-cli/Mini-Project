import bcrypt from 'bcrypt';
import { z } from 'zod';
import {
  createUser, findUserByEmail, findUserById, findUserByIdWithPassword, deleteUser,
} from '../models/user.model.js';
import { signToken } from '../utils/jwt.js';
import { ApiError } from '../middleware/errorHandler.js';

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(160),
  password: z.string().min(8).max(128),
  phone: z.string().max(20).optional(),
  role: z.enum(['driver', 'host', 'business_host']).optional(),
});

export const signup = async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const existing = await findUserByEmail(data.email);
    if (existing) throw new ApiError(409, 'An account with this email already exists');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await createUser({ ...data, passwordHash });
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

const loginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(8).max(128),
});

export const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await findUserByEmail(email);
    if (!user) throw new ApiError(401, 'Invalid email or password');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new ApiError(401, 'Invalid email or password');

    if (user.is_suspended) throw new ApiError(403, 'Your account has been suspended. Contact support.');

    const token = signToken(user);
    delete user.password_hash;
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.user_id);
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to delete your account'),
});

// Self-service account deletion for any role. Requires the current password
// as confirmation. All owned data (a host's listings/slots, a driver's
// bookings/payments/reviews/favorites) is removed automatically by the
// database's ON DELETE CASCADE constraints — see schema.sql.
export const deleteMyAccount = async (req, res, next) => {
  try {
    const { password } = deleteAccountSchema.parse(req.body);
    const user = await findUserByIdWithPassword(req.user.user_id);
    if (!user) throw new ApiError(404, 'User not found');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new ApiError(401, 'Incorrect password');

    await deleteUser(req.user.user_id);
    res.status(200).json({ message: 'Your account and all associated data have been deleted.' });
  } catch (err) {
    next(err);
  }
};
