/**
 * Week helpers. A "week" runs Monday 00:00 to Sunday 23:59 local time,
 * keyed by its Monday's date in YYYY-MM-DD.
 */

export function mondayOf(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** { start, end } as YYYY-MM-DD for the week containing `weekKey`
 *  (weekKey is a Monday date string; defaults to the current week). */
export function weekRange(weekKey?: string): { start: string; end: string } {
  const base = weekKey ? new Date(weekKey + "T00:00:00") : new Date();
  const monday = mondayOf(base);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return { start: ymd(monday), end: ymd(sunday) };
}

export function currentWeekKey(): string {
  return ymd(mondayOf(new Date()));
}

/** Human label like "Mon 3 Mar – Sun 9 Mar 2026". */
export function weekLabel(weekKey: string): string {
  const { start, end } = weekRange(weekKey);
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  return `${fmt(s)} – ${fmt(e)} ${e.getFullYear()}`;
}

/** The last `n` week keys, most recent first. */
export function recentWeekKeys(n: number): string[] {
  const keys: string[] = [];
  const monday = mondayOf(new Date());
  for (let i = 0; i < n; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() - 7 * i);
    keys.push(ymd(d));
  }
  return keys;
}
