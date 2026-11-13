// Date helpers. All dates in the app are local calendar days written as yyyy-mm-dd.

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days); // handles month ends and daylight-saving changes
  return toDateKey(date);
}

/** Whole days from a to b (b later = positive). */
export function daysBetween(a: string, b: string): number {
  const ms = Date.UTC(...utcParts(b)) - Date.UTC(...utcParts(a));
  return Math.round(ms / 86_400_000);
}

function utcParts(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y ?? 1970, (m ?? 1) - 1, d ?? 1];
}

/** Short label such as "Mon 26". */
export function shortDayLabel(key: string): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = parseDateKey(key);
  return `${names[date.getDay()]} ${date.getDate()}`;
}
