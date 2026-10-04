/**
 * Telling "this tab is running an old version of the app" apart from a real
 * fault.
 *
 * When a new version is released, a tab that has been open since before it
 * keeps the old JavaScript. Moving to a page whose file changed then asks the
 * server for a file that is no longer there. The browser reports this in
 * several different ways, none of them friendly, and "Try again" cannot help:
 * only loading the page afresh can, because that fetches the new version.
 *
 * Nothing the person wrote is at risk either way — answers are saved to the
 * database as they type, not held in the page.
 */
export function isStaleVersion(error: { name?: string; message?: string } | null | undefined): boolean {
  const text = `${error?.name ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return (
    text.includes("chunkloaderror") ||
    text.includes("loading chunk") ||
    text.includes("loading css chunk") ||
    text.includes("dynamically imported module") ||
    text.includes("importing a module script failed") ||
    text.includes("failed to fetch dynamically")
  );
}

/** Where the last automatic reload is remembered, so one cannot become a loop. */
export const RELOAD_KEY = "blueprint:reloaded-at";

/** At most one automatic reload a minute, so a broken page cannot spin. */
export const MIN_MS_BETWEEN_RELOADS = 60_000;

export function mayReload(now: number, lastReloadAt: number | null): boolean {
  if (lastReloadAt === null || !Number.isFinite(lastReloadAt)) return true;
  return now - lastReloadAt > MIN_MS_BETWEEN_RELOADS;
}
