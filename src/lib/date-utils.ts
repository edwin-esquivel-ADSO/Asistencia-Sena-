/**
 * Date and Time utilities for SENA Attendance System
 * Guarantees strict formatting in America/Bogota timezone without UTC offsets or milliseconds.
 */

/**
 * Formats date as DD/MM/AAAA in America/Bogota timezone
 */
export function formatDateBogota(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * Formats time in the 12-hour Colombian convention (for example, 1:01 p. m. or 2:30 PM).
 * Handles TIME string "HH:MM:SS" or ISO Date string converting correctly to America/Bogota.
 */
export function formatTimeBogota(timeInput: string | Date | null | undefined): string {
  if (!timeInput) return '';

  const str = String(timeInput).trim();

  // If input is a SQL TIME string (e.g. "19:26:15" or "07:26:00.123")
  if (/^\d{1,2}:\d{2}/.test(str)) {
    const cleanTime = str.split('.')[0];
    const parts = cleanTime.split(':');
    const rawHour = Number(parts[0]);
    const mm = parts[1].padStart(2, '0');
    const suffix = rawHour >= 12 ? 'p. m.' : 'a. m.';
    const hour12 = rawHour % 12 || 12;
    return `${hour12}:${mm} ${suffix}`;
  }

  // If input is an ISO string or Date object
  const date = typeof timeInput === 'string' ? new Date(timeInput) : timeInput;
  if (isNaN(date.getTime())) return str;

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * Formats date for filenames as DD-MM-AAAA
 */
export function formatDateFilenameBogota(dateInput: string | Date | null | undefined): string {
  const formatted = formatDateBogota(dateInput);
  if (!formatted) return '01-01-2026';
  return formatted.replace(/\//g, '-');
}

