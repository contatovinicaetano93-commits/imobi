/**
 * Adds months to a date, clamping to the last day of the target month when the
 * original day doesn't exist in that month (e.g. Jan 31 + 1 month → Feb 28/29).
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  // setMonth overflows when the target month has fewer days than the source day.
  // e.g. Jan 31 + 1 → setMonth yields Mar 2; getDate() !== day means overflow.
  if (result.getDate() !== day) {
    result.setDate(0); // rewind to the last day of the previous (correct) month
  }
  return result;
}
