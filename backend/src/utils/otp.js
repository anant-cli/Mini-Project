import crypto from 'crypto';

// OTPs are short-lived, single-use, 6-digit codes — a fast keyed hash
// (HMAC-SHA256 with the server's JWT secret as pepper) is appropriate here,
// unlike account passwords which use bcrypt's deliberately slow hashing.
export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000)); // 6 digits, no leading-zero ambiguity issues
}

export function hashOtp(code) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(code).digest('hex');
}

export function otpExpiryDate(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000);
}
