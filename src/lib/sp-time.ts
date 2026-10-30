// Manaus time helpers for the admin panel.
// The dashboard must show the same dates/times on every device, even when the
// computer's clock or timezone is misconfigured, so everything here pins
// America/Manaus instead of relying on the device timezone.

export const SP_TIMEZONE = "America/Manaus";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar day key ("YYYY-MM-DD") of an instant in Manaus. */
export function spDayKey(date: Date): string {
  return dayKeyFormatter.format(date);
}

/** Date+time in Manaus, pt-BR style: "30/10/2026 14:39". */
export function formatSpDateTime(iso: string, withYear: "numeric" | "2-digit" = "2-digit"): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: SP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: withYear,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Date only in Manaus. */
export function formatSpDate(iso: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: SP_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}
