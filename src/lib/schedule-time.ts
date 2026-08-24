/** Minutes from midnight, or null if the free-text time string couldn't be parsed. */
export function parseJobTime(time: string): number | null {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
  if (period === "AM") hours = hours === 12 ? 0 : hours;
  else hours = hours === 12 ? 12 : hours + 12;
  return hours * 60 + minutes;
}

export const TIMELINE_START_HOUR = 1; // 1am
export const TIMELINE_END_HOUR = 24; // through midnight
export const TIMELINE_HOUR_HEIGHT_PX = 56;
export const TIMELINE_EVENT_HEIGHT_PX = 52;

/** Pixel offset from the top of the timeline body for a given minutes-from-midnight value. */
export function minutesToTimelineOffsetPx(minutes: number | null): number | null {
  if (minutes === null) return null;
  const startMinutes = TIMELINE_START_HOUR * 60;
  const endMinutes = TIMELINE_END_HOUR * 60;
  if (minutes < startMinutes || minutes >= endMinutes) return null;
  return ((minutes - startMinutes) / 60) * TIMELINE_HOUR_HEIGHT_PX;
}
