/** Two-letter uppercase initials from a name, e.g. "Jane Smith" → "JS". */
export function getInitials(name: string | null | undefined, fallback = "U") {
  if (!name?.trim()) return fallback;
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/** Locale-stable short date, e.g. "Jul 1, 2026". */
export function formatDate(value: string | number | Date) {
  return dateFormatter.format(new Date(value));
}
