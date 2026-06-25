function formatSupportError(error: { message?: string; details?: string; hint?: string } | null) {
  if (!error) return "";
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  return parts.join(" — ") || "Request failed";
}
