/**
 * Watching a video: where someone had got to, and when it is worth going back
 * there (spec §6.4).
 *
 * The position is kept on the server, not in this browser, so picking the phone
 * up where the laptop stopped works. Everything here is plain arithmetic and
 * rules, free of React and of the player, so it can be tested on its own.
 */

/** How often a position is written while playing. Often enough not to lose a
 *  minute, rarely enough not to hammer the database. */
export const SAVE_EVERY_MS = 10_000;

/** Below this, there is nothing worth going back to. */
export const MIN_RESUME_SECONDS = 30;

/** This close to the end, the video is finished, not paused. */
export const END_MARGIN_SECONDS = 15;

export type Progress = { seconds: number; duration: number };

/**
 * Should the app offer "Continue at 4:12"? Not at the very start, and not when
 * someone has all but finished — offering to resume the last ten seconds is
 * worse than starting again.
 */
export function shouldOfferResume(p: Progress | null | undefined): boolean {
  if (!p || !Number.isFinite(p.seconds) || !Number.isFinite(p.duration)) return false;
  if (p.seconds < MIN_RESUME_SECONDS) return false;
  if (p.duration > 0 && p.seconds > p.duration - END_MARGIN_SECONDS) return false;
  return true;
}

/** A video is counted as watched once the end is in sight. */
export const isWatched = (p: Progress | null | undefined): boolean =>
  !!p && p.duration > 0 && p.seconds >= p.duration - END_MARGIN_SECONDS;

/** 4:12, or 1:04:12 for something long. Used in "Continue at …" and the length. */
export function timeLabel(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${two(minutes)}:${two(seconds)}` : `${minutes}:${two(seconds)}`;
}

/**
 * Worth writing to the server? Only when the position really moved, so a pause,
 * a seek back and forth, or the tab being hidden twice do not each cost a write.
 */
export function worthSaving(lastSaved: number | null, now: number): boolean {
  if (lastSaved === null) return now >= 1;
  return Math.abs(now - lastSaved) >= 5;
}

/** What the player should start at: the saved place, or the beginning. */
export const startAt = (p: Progress | null | undefined): number => (shouldOfferResume(p) ? p!.seconds : 0);
