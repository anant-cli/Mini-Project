import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

export const generateQrToken = () => randomBytes(24).toString('hex');

export const generateQrDataUrl = async (qrToken) => {
  const payload = JSON.stringify({ t: qrToken });
  return QRCode.toDataURL(payload, { margin: 1, width: 320 });
};
