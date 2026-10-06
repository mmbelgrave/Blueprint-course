"use client";
/**
 * The chosen theme as something React can subscribe to.
 *
 * localStorage tells no one when it changes in this tab — its own event fires
 * only in other tabs — so changes are announced here. That lets the switch read
 * the stored value with useSyncExternalStore instead of copying it into state
 * after mount, which would render once with the wrong answer.
 *
 * The rules themselves live in theme.ts, which stays free of the browser.
 */
import { THEME_KEY, type Theme } from "@/lib/theme";

const listeners = new Set<() => void>();

export function subscribeTheme(onChange: () => void) {
  listeners.add(onChange);
  // Another tab of the same app changing it counts too.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function getStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null; // Storage blocked: treated as "follow my device".
  }
}

/** On the server nobody has chosen anything yet. */
export const getServerTheme = () => null;

export function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Nothing to remember it with; it still applies until the tab closes.
  }
  for (const l of listeners) l();
}
