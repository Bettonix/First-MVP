/**
 * Utility belt for safe, precise financial operations.
 * All internal values are stored as integers (centavos) to avoid
 * floating-point rounding errors inherent to IEEE 754.
 */

/**
 * Formats an integer amount in centavos to BRL currency string.
 * Guards against NaN, undefined, null, and non-numeric inputs.
 */
export function fmtBRL(centavos: number | null | undefined): string {
  const safe = safeCentavos(centavos);
  return (safe / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Converts a user-entered float string (e.g. "12.50" or "12,50")
 * to centavos integer. Returns 0 for invalid inputs.
 * Uses requested sanitization: replace(/[^0-9.]/g, '')
 */
export function parseToCentavos(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === '') return 0;
  
  // Sanitize: keep only digits and dots
  const sanitized = String(input).replace(',', '.').replace(/[^0-9.]/g, '');
  const parsed = parseFloat(sanitized);
  
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Ensures a centavos value is a valid, finite integer.
 * Falls back to 0 for any garbage input.
 */
export function safeCentavos(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  
  // If it's a string, sanitize it first
  if (typeof value === 'string') {
    const sanitized = value.replace(/[^0-9-]/g, ''); // Keep digits and minus sign
    const n = parseInt(sanitized, 10);
    return Number.isFinite(n) ? n : 0;
  }
  
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
