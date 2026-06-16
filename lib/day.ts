// Pure UTC epoch-day helpers. A "day" is an integer index of whole UTC days
// since the Unix epoch (1970-01-01 = day 0).

const MS_PER_DAY = 86_400_000;

export function epochDay(d?: Date): number {
  return Math.floor((d ?? new Date()).getTime() / MS_PER_DAY);
}

export function dayToISO(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

export function isoToDay(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / MS_PER_DAY);
}
