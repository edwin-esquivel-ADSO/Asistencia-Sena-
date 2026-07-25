import crypto from 'crypto';

/**
 * Generates a rotative token based on session token and 30-second time slot
 */
export function generateRotativeToken(sessionToken: string, timeSlotOffset: number = 0): string {
  const timeSlot = Math.floor(Date.now() / 30000) + timeSlotOffset;
  return crypto
    .createHmac('sha256', sessionToken)
    .update(`sena_rotative_slot:${timeSlot}`)
    .digest('hex')
    .substring(0, 16);
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
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(rotativeToken))) {
      return true;
    }
  }
  return false;
}

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
