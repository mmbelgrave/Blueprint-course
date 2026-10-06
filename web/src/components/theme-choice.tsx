"use client";
// Light or dark, chosen in My settings. Takes effect as you pick it, and is
// remembered in this browser — see src/lib/theme.ts for why not in the account.
import { useEffect, useSyncExternalStore } from "react";
import { applyTheme, readTheme, resolveTheme, THEME_CHOICES, type Theme } from "@/lib/theme";
import { getServerTheme, getStoredTheme, storeTheme, subscribeTheme } from "@/lib/theme-store";

const prefersDark = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeChoice() {
  const theme = readTheme(useSyncExternalStore(subscribeTheme, getStoredTheme, getServerTheme));

  // While following the device, change with it: someone whose phone turns dark
  // in the evening should not have to come back here.
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => applyTheme(document.documentElement, resolveTheme("system", media.matches));
    follow();
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, [theme]);

  const choose = (next: Theme) => {
    applyTheme(document.documentElement, resolveTheme(next, prefersDark()));
    storeTheme(next);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-pine">How the app looks</h2>
      <div role="radiogroup" aria-label="How the app looks" className="space-y-2">
        {THEME_CHOICES.map((c) => (
          <label key={c.value} className="flex gap-3">
            <input
              type="radio"
              name="theme"
              className="mt-1.5 h-5 w-5 accent-pine"
              checked={theme === c.value}
              onChange={() => choose(c.value)}
            />
            <span>
              {c.label}
              <span className="block text-sm text-stone">{c.note}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-sm text-stone">
        This is remembered on this device. Printing stays on white paper either way.
      </p>
    </section>
  );
}
