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
 * Formats time as HH:MM:SS (24-hour) in America/Bogota timezone
 */
export function formatTimeBogota(timeInput: string | Date | null | undefined): string {
  if (!timeInput) return '';

  // If input is already a TIME string (e.g. "14:30:15" or "08:15:00.12345")
  if (typeof timeInput === 'string' && /^\d{1,2}:\d{2}/.test(timeInput.trim())) {
    const cleanTime = timeInput.trim().split('.')[0]; // remove milliseconds if any
    const parts = cleanTime.split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const ss = (parts[2] || '00').padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  const date = typeof timeInput === 'string' ? new Date(timeInput) : timeInput;
  if (isNaN(date.getTime())) return String(timeInput);

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
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
