// "2026-10-24" for a date in THIS phone's time zone. (toISOString() would use UTC,
// so a 9pm weigh-in in Boston would land on tomorrow.)
export function localDay(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}