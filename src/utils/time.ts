/** Format a number of milliseconds to MM:SS */
export function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/** Format seconds to MM:SS */
export function formatSeconds(seconds: number): string {
  return formatMs(seconds * 1000);
}

/** Minutes to milliseconds */
export function minToMs(minutes: number): number {
  return minutes * 60 * 1000;
}
