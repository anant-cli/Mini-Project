import bcrypt from 'bcrypt';
import { z } from 'zod';
import {
  createUser, findUserByEmail, findUserById, findUserByIdWithPassword, deleteUser,
  setEmailVerified, updatePasswordHash, registerFailedLogin, clearFailedLogins,
} from '../models/user.model.js';
import {
  createOtp, getActiveOtp, getMostRecentOtp, incrementOtpAttempts, consumeOtp,
} from '../models/otp.model.js';
import { generateOtp, hashOtp, otpExpiryDate } from '../utils/otp.js';
import { sendEmail, otpEmailHtml } from '../utils/email.js';
import { signToken } from '../utils/jwt.js';
import { ApiError } from '../middleware/errorHandler.js';

const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

// Passwords need at least one letter and one number on top of the length
// check — stops "aaaaaaaa"-style passwords without being obnoxious about it.
const passwordSchema = z.string().min(8).max(128)
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

async function issueAndSendOtp(user, purpose) {
  const code = generateOtp();
  const tokenHash = hashOtp(code);
  await createOtp(user.user_id, purpose, tokenHash, otpExpiryDate(10));
  await sendEmail({
    to: user.email,
    subject: purpose === 'password_reset' ? 'Your ParkSlot password reset code' : 'Verify your ParkSlot email',
    html: otpEmailHtml({ name: user.name, code, purpose }),
  });
}

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(160),
  password: passwordSchema,
  phone: z.string().max(20).optional(),
  role: z.enum(['driver', 'host', 'business_host']).optional(),
});

export const signup = async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const existing = await findUserByEmail(data.email);
    if (existing) throw new ApiError(409, 'An account with this email already exists');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await createUser({ ...data, passwordHash });

    await issueAndSendOtp(user, 'email_verify');

    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

// Strips fields that are for internal server-side logic only (password
// hash, brute-force counters) so they never ride along in an API response —
// even to the account's own owner, these are implementation detail, not
// something a client should see or depend on.
function toPublicUser(user) {
  const { password_hash: _ph, failed_login_attempts: _fla, locked_until: _lu, ...publicUser } = user;
  return publicUser;
}

const loginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(128),
});

export const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await findUserByEmail(email);

    // Same generic error whether the email doesn't exist or the password is
    // wrong — never reveal which one, to avoid confirming registered emails.
    const genericError = () => new ApiError(401, 'Invalid email or password');
    if (!user) throw genericError();

    if (user.is_suspended) throw new ApiError(403, 'Your account has been suspended. Contact support.');

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      throw new ApiError(429, `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await registerFailedLogin(user.user_id);
      throw genericError();
    }

    await clearFailedLogins(user.user_id);

    const token = signToken(user);
    res.json({ user: toPublicUser(user), token });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.user_id);
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
};

// ---------- Email verification (OTP) ----------
const verifyEmailSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const verifyEmail = async (req, res, next) => {
  try {
    if (req.user.email_verified) {
      return res.json({ message: 'Your email is already verified.' });
    }
    const { otp } = verifyEmailSchema.parse(req.body);
    const active = await getActiveOtp(req.user.user_id, 'email_verify');
    if (!active) throw new ApiError(400, 'That code has expired. Request a new one.');
    if (active.attempts >= MAX_OTP_ATTEMPTS) throw new ApiError(429, 'Too many incorrect attempts. Request a new code.');

    if (active.token_hash !== hashOtp(otp)) {
      await incrementOtpAttempts(active.otp_id);
      throw new ApiError(400, 'Incorrect code. Please try again.');
    }

    await consumeOtp(active.otp_id);
    await setEmailVerified(req.user.user_id);
    res.json({ message: 'Email verified.' });
  } catch (err) {
    next(err);
  }
};

const resendSchema = z.object({
  purpose: z.enum(['email_verify']).default('email_verify'),
});

export const resendOtp = async (req, res, next) => {
  try {
    const { purpose } = resendSchema.parse(req.body || {});
    if (purpose === 'email_verify' && req.user.email_verified) {
      return res.json({ message: 'Your email is already verified.' });
    }

    const recent = await getMostRecentOtp(req.user.user_id, purpose);
    if (recent) {
      const secondsSince = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
      if (secondsSince < RESEND_COOLDOWN_SECONDS) {
        throw new ApiError(429, `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince)}s before requesting another code.`);
      }
    }

    const user = await findUserById(req.user.user_id);
    await issueAndSendOtp(user, purpose);
    res.json({ message: 'A new code has been sent to your email.' });
  } catch (err) {
    next(err);
  }
};

// ---------- Forgot / reset password (OTP, unauthenticated) ----------
const forgotPasswordSchema = z.object({ email: z.string().email().max(160) });

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await findUserByEmail(email);

    // Always the same response whether or not the account exists, and
    // regardless of the resend cooldown result — an attacker probing this
    // endpoint should never be able to distinguish "no such account" from
    // "code already sent, please wait".
    const genericMessage = { message: 'If an account exists for that email, a reset code has been sent.' };

    if (!user) return res.json(genericMessage);

    const recent = await getMostRecentOtp(user.user_id, 'password_reset');
    if (recent) {
      const secondsSince = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
      if (secondsSince < RESEND_COOLDOWN_SECONDS) return res.json(genericMessage);
    }

    await issueAndSendOtp(user, 'password_reset');
    res.json(genericMessage);
  } catch (err) {
    next(err);
  }
};

const resetPasswordSchema = z.object({
  email: z.string().email().max(160),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  new_password: passwordSchema,
});

export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, new_password: newPassword } = resetPasswordSchema.parse(req.body);
    const user = await findUserByEmail(email);
    if (!user) throw new ApiError(400, 'Invalid code or email.');

    const active = await getActiveOtp(user.user_id, 'password_reset');
    if (!active) throw new ApiError(400, 'That code has expired. Request a new one.');
    if (active.attempts >= MAX_OTP_ATTEMPTS) throw new ApiError(429, 'Too many incorrect attempts. Request a new code.');

    if (active.token_hash !== hashOtp(otp)) {
      await incrementOtpAttempts(active.otp_id);
      throw new ApiError(400, 'Incorrect code. Please try again.');
    }

    await consumeOtp(active.otp_id);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await updatePasswordHash(user.user_id, passwordHash);
    await clearFailedLogins(user.user_id);

    res.json({ message: 'Password reset. You can now log in with your new password.' });
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
