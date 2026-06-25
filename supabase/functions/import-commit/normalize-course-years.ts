/** SSBJ: Class 6 entry through passing-out (batch) year = 7 school years. */
export const SSBJ_SCHOOL_SPAN_YEARS = 7;

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
  mapped.course_start_year = end - SSBJ_SCHOOL_SPAN_YEARS;
}
