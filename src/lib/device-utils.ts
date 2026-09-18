/**
 * Device and Browser Detection Utilities for SENA Attendance System
 * Provides clean Spanish labels for devices and browsers without redundant string duplications.
 */

export interface DeviceInfo {
  navegador: string;
  dispositivo: string;
}

export function parseUserAgent(ua: string | null | undefined): DeviceInfo {
  if (!ua) {
    return { navegador: 'Navegador Web', dispositivo: 'Teléfono Móvil' };
  }

  const t = ua.toLowerCase();

  let navegador = 'Navegador Web';
  if (t.includes('opera') || t.includes('opr')) navegador = 'Opera';
  else if (t.includes('edg')) navegador = 'Edge';
  else if (t.includes('chrome')) navegador = 'Chrome';
  else if (t.includes('safari') && !t.includes('chrome')) navegador = 'Safari';
  else if (t.includes('firefox')) navegador = 'Firefox';

  let dispositivo = 'PC Escritorio';

  if (t.includes('iphone')) {
    dispositivo = 'iPhone (iOS)';
  } else if (t.includes('ipad')) {
    dispositivo = 'iPad (iOS)';
  } else if (t.includes('android')) {
    dispositivo = t.includes('mobile') ? 'Teléfono Android' : 'Tablet Android';
  } else if (t.includes('windows phone')) {
    dispositivo = 'Teléfono Windows';
  } else if (t.includes('windows')) {
    dispositivo = 'Windows PC';
  } else if (t.includes('macintosh') || t.includes('mac os')) {
    dispositivo = 'Mac (macOS)';
  } else if (t.includes('linux')) {
    dispositivo = 'Linux PC';
  } else if (t.includes('mobile') || t.includes('phone')) {
    dispositivo = 'Teléfono Móvil';
  }

  return { navegador, dispositivo };
}
