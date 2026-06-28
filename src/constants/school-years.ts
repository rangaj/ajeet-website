/** SSBJ: Class 6 entry through passing-out (batch) year = 7 school years. */
export const SSBJ_SCHOOL_SPAN_YEARS = 7;

/** SSBJ was founded in 1963; the earliest possible join year. */
export const SCHOOL_FOUNDED_YEAR = 1963;

/** The first batch passed out in 1967 — the earliest valid batch (passing-out) year. */
export const FIRST_PASSOUT_BATCH_YEAR = 1967;

/** Upper bound accepted for batch / join-year inputs. */
export const MAX_SCHOOL_YEAR = 2030;

/**
 * Earliest plausible birth year for an Ajeet: first pass-out (1967) minus the
 * oldest plausible pass-out age (~19), with a year of slack.
 */
export const MIN_BIRTH_YEAR = 1947;

/**
 * Batches with a non-standard entry year (passing-out year → join year).
 * Batch 1982 joined in 1974 (8-year span).
 */
export const BATCH_JOIN_YEAR_OVERRIDES: Record<number, number> = {
  1982: 1974,
};

export function joinYearFromBatchYear(batchYear: number): number {
  const override = BATCH_JOIN_YEAR_OVERRIDES[batchYear];
  const join = override !== undefined ? override : batchYear - SSBJ_SCHOOL_SPAN_YEARS;
  // No one could have joined before the school existed (founded 1963), so the
  // founding batches necessarily entered at higher classes with a shorter span.
  return Math.max(join, SCHOOL_FOUNDED_YEAR);
}

/** String batch year from the form → join year string, or empty if invalid. */
export function joinYearStringFromBatch(batchYearStr: string): string {
  const end = Number(batchYearStr.trim());
  if (!Number.isFinite(end) || end <= 0) return "";
  return String(joinYearFromBatchYear(end));
}
