import crypto from 'crypto';

const HMAC_SECRET = process.env.QR_HMAC_SECRET || 'event-saas-hmac-secret-key-2026';

export interface QRPayload {
  ticketId: string;
  orderId: string;
  eventId: string;
  seatId: string;
  attendeeEmail: string;
  timestamp: number;
}

export interface SignedQR {
  payload: QRPayload;
  sig: string;
}

export function generateSignedQR(payload: QRPayload): string {
  const dataString = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', HMAC_SECRET).update(dataString).digest('hex');
  const signedObj: SignedQR = { payload, sig };
  return Buffer.from(JSON.stringify(signedObj)).toString('base64url');
}

export function verifyAndDecodeQR(encodedStr: string): { valid: boolean; payload?: QRPayload; error?: string } {
  try {
    const raw = Buffer.from(encodedStr, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw) as SignedQR;

    if (!parsed || !parsed.payload || !parsed.sig) {
      return { valid: false, error: 'Malformed QR Code structure.' };
    }

    const dataString = JSON.stringify(parsed.payload);
    const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(dataString).digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(parsed.sig), Buffer.from(expectedSig))) {
      return { valid: true, payload: parsed.payload };
    } else {
      return { valid: false, error: 'HMAC-SHA256 signature verification failed. Token tampered or counterfeit!' };
    }
  } catch (err: any) {
    return { valid: false, error: 'Invalid Base64 or JSON decoding error: ' + err.message };
  }
}
