import crypto from 'crypto';

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(code) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(code).digest('hex');
}

export function otpExpiryDate(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000);
}
