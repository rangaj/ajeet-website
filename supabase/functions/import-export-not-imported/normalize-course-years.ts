/** SSBJ: Class 6 entry through passing-out (batch) year = 7 school years. */
export const SSBJ_SCHOOL_SPAN_YEARS = 7;

/** Passing-out year → join year for batches that did not follow the 7-year span. */
export const BATCH_JOIN_YEAR_OVERRIDES: Record<number, number> = {
  1982: 1974,
};

export function joinYearFromBatchYear(batchYear: number): number {
  const override = BATCH_JOIN_YEAR_OVERRIDES[batchYear];
  if (override !== undefined) return override;
  return batchYear - SSBJ_SCHOOL_SPAN_YEARS;
}

/** Derive join year from batch year; legacy imports often used a 12-year span. */
export function normalizeSchoolCourseYears(mapped: Record<string, unknown>): void {
  const endRaw = mapped.course_end_year;
  if (endRaw === undefined || endRaw === null || String(endRaw).trim() === "") {
    return;
  }
  const end = Number(endRaw);
  if (!Number.isFinite(end) || end <= 0) {
    return;
  }
  mapped.course_start_year = joinYearFromBatchYear(end);
}
