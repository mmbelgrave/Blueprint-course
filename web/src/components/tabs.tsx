"use client";
/*
 * The four places the app is made of, along the bottom of a phone (spec §6.9).
 *
 * Phones only: on a tablet or a computer the links stay in the header, where
 * there is room for them and where a thumb is not the thing doing the reaching.
 *
 * Help is not here on purpose. It lives in Settings, because "Ask Mwata" already
 * sits beside the AI partner on every exercise page, which is where people
 * actually get stuck.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: React.ReactNode; match: (path: string) => boolean };

/* Simple line drawings in the brand's weight; they take their colour from the text. */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden {...stroke}>
    {children}
  </svg>
);

const TABS: Tab[] = [
  {
    href: "/modules",
    label: "Modules",
    // Stacked layers: the course, in parts.
    icon: (
      <Icon>
        <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
        <path d="M3 12.5 12 17l9-4.5" />
        <path d="M3 17.5 12 22l9-4.5" />
      </Icon>
    ),
    match: (p) => p.startsWith("/modules"),
  },
  {
    href: "/dashboard",
    label: "Exercises",
    // A page with writing on it.
    icon: (
      <Icon>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v4h4" />
        <path d="M9 12h6M9 16h6" />
      </Icon>
    ),
    match: (p) => p === "/dashboard" || p.startsWith("/step") || p.startsWith("/how-it-works"),
  },
  {
    href: "/me",
    label: "AI",
    // A quiet spark: the partner that remembers.
    icon: (
      <Icon>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
        <circle cx="12" cy="12" r="4" />
      </Icon>
    ),
    match: (p) => p.startsWith("/me"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 2.5v2M12 19.5v2M4.2 7.2l1.7 1M18.1 15.8l1.7 1M4.2 16.8l1.7-1M18.1 8.2l1.7-1" />
      </Icon>
    ),
    match: (p) => p.startsWith("/settings") || p.startsWith("/help"),
  },
];

export function Tabs({ free = false }: { free?: boolean }) {
  const path = usePathname();
  // A free account keeps Modules and Settings. The Exercises overview is the
  // whole eight-step road — the structure a free account should not be shown —
  // and the AI partner comes with the course.
  const tabs = free ? TABS.filter((t) => t.href === "/modules" || t.href === "/settings") : TABS;
  return (
    <nav
      aria-label="The app"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-sand sm:hidden print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((t) => {
          const here = t.match(path);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={here ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${here ? "font-semibold text-ochre" : "text-stone"}`}
              >
                {t.icon}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The room the bar takes, so the last answer box and "Mark as done" are never
 * hidden behind it. Phones only, like the bar itself.
 */
export const TABS_ROOM = "pb-[4.5rem] sm:pb-0 print:pb-0";
