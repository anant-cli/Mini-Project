import nodemailer from 'nodemailer';

const DEFAULT_SUPPORT_EMAIL = 'parkslot.support@gmail.com';

let cachedTransporter;

function getTransporter() {
  if (cachedTransporter !== undefined) return cachedTransporter;

  if (!process.env.SMTP_HOST) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return cachedTransporter;
}

export async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || `ParkSlot <${process.env.SMTP_USER || DEFAULT_SUPPORT_EMAIL}>`;

  const emailLog = `\n[email-payload] To: ${to}\nSubject: ${subject}\n${html.replace(/<[^>]+>/g, ' ').trim()}\n`;

  if (!transporter) {
    console.log(`[email:dev-mode] (No SMTP configured)${emailLog}`);
    return { delivered: false, devMode: true };
  }

  try {
    await transporter.sendMail({ from, to, subject, html });
    return { delivered: true, devMode: false };
  } catch (error) {
    console.error(`\n[email:error] Failed to send email via SMTP. Email payload was:${emailLog}`);
    console.error('[email:error-details]', error.message);
    throw new Error('Failed to send email. Please check SMTP configuration or App Password.');
  }
}

export function otpEmailHtml({ name, code, purpose }) {
  const heading = purpose === 'password_reset' ? 'Reset your password' : 'Verify your email';
  const body = purpose === 'password_reset'
    ? 'Use this code to reset your ParkSlot password.'
    : 'Use this code to verify your email and finish setting up your ParkSlot account.';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">${heading}</h2>
      <p>Hi ${name || 'there'},</p>
      <p>${body}</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background: #f2f2f2; padding: 16px 24px; border-radius: 8px; text-align: center;">${code}</p>
      <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      <p style="color: #999; font-size: 12px; margin-top: 32px;">— ParkSlot</p>
    </div>
  `;
}
