/** SSBJ: Class 6 entry through passing-out (batch) year = 7 school years. */
export const SSBJ_SCHOOL_SPAN_YEARS = 7;

export function joinYearFromBatchYear(batchYear: number): number {
  return batchYear - SSBJ_SCHOOL_SPAN_YEARS;
}

/** String batch year from the form → join year string, or empty if invalid. */
export function joinYearStringFromBatch(batchYearStr: string): string {
  const end = Number(batchYearStr.trim());
  if (!Number.isFinite(end) || end <= 0) return "";
  return String(joinYearFromBatchYear(end));
}
