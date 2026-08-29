import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

// Each booking gets a unique, unguessable token. The QR code just encodes
export const generateQrToken = () => randomBytes(24).toString('hex');

export const generateQrDataUrl = async (qrToken) => {
  const payload = JSON.stringify({ t: qrToken });
  return QRCode.toDataURL(payload, { margin: 1, width: 320 });
};
