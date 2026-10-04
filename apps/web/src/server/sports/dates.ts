/**
 * Calendar-day helpers. ESPN buckets scoreboards by US Eastern day, so we
 * do calendar arithmetic on the Eastern date, never by adding 24h to a
 * timestamp (which skips or repeats a day across DST changes).
 */

const ET_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Eastern calendar dates as YYYYMMDD, from `fromOffset` to `toOffset` days. */
export function easternDays(now: Date, fromOffset: number, toOffset: number): string[] {
  const [y, m, d] = ET_DATE.format(now).split('-').map(Number) as [number, number, number];
  const days: string[] = [];
  for (let i = fromOffset; i <= toOffset; i++) {
    const day = new Date(Date.UTC(y, m - 1, d + i, 12));
    days.push(day.toISOString().slice(0, 10).replaceAll('-', ''));
  }
  return days;
}
