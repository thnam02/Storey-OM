/** Wall-clock date and time in a given time zone. */

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/**
 * Parse a timestamp from the API ("2026-11-17T10:30:00+00:00") or in
 * Postgres text form ("2026-11-17 10:30:00+00").
 */
export function parseMoment(text: string): Date {
  const iso = text
    .trim()
    .replace(' ', 'T')
    .replace(/([+-]\d{2})$/, '$1:00')
    .replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  return new Date(iso);
}

/** A moment as local "YYYY-MM-DD" and "HH:MM" in `timeZone`. */
export function zonedParts(moment: string | Date, timeZone: string): { date: string; time: string } {
  const d = typeof moment === 'string' ? parseMoment(moment) : moment;
  if (Number.isNaN(d.getTime())) throw new Error(`Not a time: ${String(moment)}`);
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(d).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** Local wall time "YYYY-MM-DDTHH:MM" for a moment. */
export function wallTime(moment: string | Date, timeZone: string): string {
  const { date, time } = zonedParts(moment, timeZone);
  return `${date}T${time}`;
}

/** The current time of day on `day` (the app's "today", which sample data pins). */
export function nowOnDay(day: string, timeZone: string, now = new Date()): string {
  return `${day}T${zonedParts(now, timeZone).time}`;
}
