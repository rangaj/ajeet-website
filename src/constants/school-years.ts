/** SSBJ: Class 6 entry through passing-out (batch) year = 7 school years. */
export const SSBJ_SCHOOL_SPAN_YEARS = 7;

/**
 * Batches with a non-standard entry year (passing-out year → join year).
 * Batch 1982 joined in 1974 (8-year span).
 */
export const BATCH_JOIN_YEAR_OVERRIDES: Record<number, number> = {
  1982: 1974,
};

export function joinYearFromBatchYear(batchYear: number): number {
  const override = BATCH_JOIN_YEAR_OVERRIDES[batchYear];
  if (override !== undefined) return override;
  return batchYear - SSBJ_SCHOOL_SPAN_YEARS;
}

/** String batch year from the form → join year string, or empty if invalid. */
export function joinYearStringFromBatch(batchYearStr: string): string {
  const end = Number(batchYearStr.trim());
  if (!Number.isFinite(end) || end <= 0) return "";
  return String(joinYearFromBatchYear(end));
}
