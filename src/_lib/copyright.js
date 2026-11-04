export function copyrightYears(year = new Date().getFullYear()) {
  return year > 2026 ? `2026–${year}` : "2026";
}
