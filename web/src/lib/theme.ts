/**
 * Light or dark, and who decides.
 *
 * Three answers: follow the device (the default), always light, always dark.
 * The choice is kept in this browser, not in the account, for two reasons: it
 * is a property of the screen you are reading on rather than of you — a phone
 * at night and a laptop by a window want different answers — and it has to be
 * known before the first pixel is drawn, which a trip to the database cannot
 * promise.
 *
 * Kept free of React so it can be tested, and small enough to run inline in the
 * page head before anything is painted (see layout.tsx).
 */

export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "blueprint:theme";

export const THEME_CHOICES: { value: Theme; label: string; note: string }[] = [
  { value: "system", label: "Follow my device", note: "Light or dark, whichever your phone or computer is set to." },
  { value: "light", label: "Light", note: "Sand and Pine, like the workbook on paper." },
  { value: "dark", label: "Dark", note: "Easier at night and in low light." },
];

export const isTheme = (v: unknown): v is Theme => v === "system" || v === "light" || v === "dark";

/** What a stored value means, treating anything unexpected as "follow my device". */
export const readTheme = (stored: string | null | undefined): Theme => (isTheme(stored) ? stored : "system");

/** The ground to actually draw: "system" asks the device. */
export const resolveTheme = (theme: Theme, devicePrefersDark: boolean): "light" | "dark" =>
  theme === "system" ? (devicePrefersDark ? "dark" : "light") : theme;

/**
 * Light is the app's own ground, so it carries no attribute at all: only dark
 * is marked. That keeps the light app exactly as it was.
 */
export function applyTheme(root: { dataset: DOMStringMap }, ground: "light" | "dark") {
  if (ground === "dark") root.dataset.theme = "dark";
  else delete root.dataset.theme;
}
