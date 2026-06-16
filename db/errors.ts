export function isPostgresUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const directCode = (error as { code?: string }).code;
  if (directCode === "23505") {
    return true;
  }

  const cause = (error as { cause?: { code?: string } }).cause;
  return cause?.code === "23505";
}
