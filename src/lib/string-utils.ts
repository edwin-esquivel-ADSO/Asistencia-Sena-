/**
 * String normalization helper for strict SENA Apprentice Name & Document comparisons.
 * Converts strings to lowercase, removes accents/diacritics, and strips extra spaces.
 */

export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function cleanDocumentNumber(doc: string | null | undefined): string {
  if (!doc) return '';
  return String(doc).trim().replace(/[^0-9a-zA-Z]/g, '');
}
