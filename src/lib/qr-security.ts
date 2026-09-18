import crypto from 'crypto';

/**
 * Safe timing-constant comparison helper to prevent timing attacks
 */
export function safeTimingEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generates a rotative token based on session token and 30-second time slot (128-bit min / 32 hex chars)
 */
export function generateRotativeToken(sessionToken: string, timeSlotOffset: number = 0): string {
  const timeSlot = Math.floor(Date.now() / 30000) + timeSlotOffset;
  return crypto
    .createHmac('sha256', sessionToken)
    .update(`sena_rotative_slot:${timeSlot}`)
    .digest('hex')
    .substring(0, 32); // 32 hex chars = 128 bits
}

/**
 * Validates if provided rotativeToken matches current, previous or next 30-second slot
 */
export function validateRotativeToken(sessionToken: string, rotativeToken: string): boolean {
  if (!rotativeToken) return false;
  
  // Allow matching slot 0 (current), -1 (previous slot for latency), or +1
  const slotOffsets = [0, -1, 1];
  for (const offset of slotOffsets) {
    const expected = generateRotativeToken(sessionToken, offset);
    if (safeTimingEqual(expected, rotativeToken)) {
      return true;
    }
  }
  return false;
}

export const verifyRotativeToken = validateRotativeToken;

/**
 * Haversine formula to calculate distance in meters between two GPS coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
