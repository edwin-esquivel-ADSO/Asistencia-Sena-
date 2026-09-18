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
 * Formats date compactly as "12 ago. 2026" in America/Bogota timezone
 */
export function formatCompactDateBogota(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  // Append T12:00:00 if it is a pure YYYY-MM-DD date to avoid timezone shift on UTC parse
  let date: Date;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    date = new Date(`${dateInput}T12:00:00-05:00`);
  } else {
    date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  }
  if (isNaN(date.getTime())) return String(dateInput);

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

/**
 * Humanizes excuse date ranges cleanly in America/Bogota:
 * Single day: "12 ago. 2026"
 * Same month range: "12 – 15 ago. 2026"
 * Different month/year: "28 ago. – 02 sep. 2026"
 */
export function formatExcusePeriod(
  startDateInput: string | Date | null | undefined,
  endDateInput: string | Date | null | undefined
): string {
  if (!startDateInput) return '';
  if (!endDateInput || startDateInput === endDateInput) {
    return formatCompactDateBogota(startDateInput);
  }

  const startStr = typeof startDateInput === 'string' ? startDateInput.slice(0, 10) : '';
  const endStr = typeof endDateInput === 'string' ? endDateInput.slice(0, 10) : '';

  if (startStr && endStr && startStr === endStr) {
    return formatCompactDateBogota(startDateInput);
  }

  const formattedStart = formatCompactDateBogota(startDateInput);
  const formattedEnd = formatCompactDateBogota(endDateInput);

  // Check if same month and year
  const startParts = formattedStart.split(' ');
  const endParts = formattedEnd.split(' ');

  if (startParts.length === 3 && endParts.length === 3) {
    if (startParts[1] === endParts[1] && startParts[2] === endParts[2]) {
      // Same month and year: "12 – 15 ago. 2026"
      return `${startParts[0]} – ${endParts[0]} ${endParts[1]} ${endParts[2]}`;
    }
  }

  return `${formattedStart} – ${formattedEnd}`;
}

/**
 * Formats time in the 12-hour Colombian convention (for example, 1:01 p. m.).
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
