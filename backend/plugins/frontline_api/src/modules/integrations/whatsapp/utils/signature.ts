import { createHmac, timingSafeEqual } from 'node:crypto';

/** Verifies Meta's X-Hub-Signature-256 header against the raw request body. */
export const hasValidWhatsappSignature = (
  rawBody: Buffer | undefined,
  signature: string | undefined,
  appSecret: string,
): boolean => {
  if (!rawBody || !signature || !appSecret) return false;

  const expected = Buffer.from(
    `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`,
  );
  const received = Buffer.from(signature);

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};
