/**
 * Calendar-date helpers for ISO dates (YYYY-MM-DD). Dates are treated as
 * plain days in UTC so the result never shifts with the viewer's time zone.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toDate = (iso: string) => new Date(iso + 'T00:00:00Z');
const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (iso: string) => toDate(iso).getUTCDay();

/** "17 Nov" */
export function formatDay(iso: string): string {
  const d = toDate(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Mon 16 Nov" */
export const formatWeekdayDay = (iso: string) => `${WEEKDAYS[weekday(iso)]!.slice(0, 3)} ${formatDay(iso)}`;

/** "Tuesday 17 Nov" */
export const formatLongDay = (iso: string) => `${WEEKDAYS[weekday(iso)]} ${formatDay(iso)}`;

/** "November" */
export const monthName = (iso: string) => MONTHS_LONG[toDate(iso).getUTCMonth()]!;

/**
 * "19 Nov" → ISO date, taking the year from `near` and picking whichever of
 * last, this or next year lands closest to it. Null if it doesn't parse.
 */
export function parseDayMonth(text: string, near: string): string | null {
  const m = /^(\d{1,2}) ([A-Z][a-z]{2})$/.exec(text.trim());
  const month = m ? MONTHS.indexOf(m[2]!) : -1;
  if (!m || month < 0) return null;
  const year = toDate(near).getUTCFullYear();
  const candidates = [year - 1, year, year + 1].map((y) => toIso(new Date(Date.UTC(y, month, Number(m[1])))));
  const dist = (iso: string) => Math.abs(toDate(iso).getTime() - toDate(near).getTime());
  return candidates.reduce((a, b) => (dist(b) < dist(a) ? b : a));
}

/** Choices for a new task's due date: today, tomorrow, this Friday, a week from today. */
export function dueDateOptions(today: string): { label: string; value: string }[] {
  const toFriday = (5 - weekday(today) + 7) % 7 || 7;
  const options = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'Friday', value: addDays(today, toFriday) },
    { label: 'Next week', value: addDays(today, 7) },
  ];
  // Drop "Friday" when it is tomorrow.
  return options.filter((o, i) => options.findIndex((x) => x.value === o.value) === i);
}
