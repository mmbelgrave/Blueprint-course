"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Lockup } from "@/components/brand";
import { isFree } from "@/lib/access-app";
import { endingSoon } from "@/lib/access";
import { useApp } from "@/lib/app-state";
import { isSupabaseConfigured } from "@/lib/backend";
import { PRODUCT } from "@/lib/content";
import { SELF_STUDY } from "@/lib/legal";
import { Tabs, TABS_ROOM, tabsFor } from "@/components/tabs";
import { useIsAdmin } from "@/lib/use-is-admin";

export function Shell({
  children,
  wide = false,
  ownHeader = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
  /** The page draws its own head on a phone, so this one steps aside there. */
  ownHeader?: boolean;
}) {
  const { user, entitlements } = useApp();
  const free = isFree(entitlements);
  const path = usePathname();
  const isAdmin = useIsAdmin(!!user);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {!isSupabaseConfigured && (
        <div className="bg-ochre px-4 py-1.5 text-center text-sm text-white print:hidden">
          Preview mode. No account. Your answers are saved in this browser only.
        </div>
      )}
      <header className={`border-b border-line bg-sand print:hidden ${ownHeader ? "hidden sm:block" : ""}`}>
        <div
          className={`mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-3 sm:justify-between ${
            wide ? "max-w-7xl lg:pr-[25rem]" : "max-w-4xl"
          }`}
        >
          <Link href={user ? "/modules" : "/"} aria-label={PRODUCT.name}>
            <Lockup />
          </Link>
          {/* The same four places the phone has along the bottom, named the
              same way, plus the two that are not tabs. */}
          {user && (
            <nav className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:flex">
              {tabsFor(free).map((t) => {
                const here = t.match(path);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    aria-current={here ? "page" : undefined}
                    className={here ? "font-semibold text-ochre" : "text-pine hover:underline"}
                  >
                    {t.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link href="/admin" className="font-semibold text-ochre hover:underline">
                  Admin
                </Link>
              )}
            </nav>
          )}
        </div>
      </header>
      <GraceBanner endsAt={endingSoon(entitlements)} />
      <main className={`mx-auto w-full flex-1 px-4 py-8 ${wide ? "max-w-7xl" : "max-w-4xl"} ${user ? TABS_ROOM : ""}`}>
        {children}
      </main>
      {user && <Tabs free={free} />}
      {/* One line, on every page. The two links it used to carry are at the
          foot of My settings, where somebody goes looking for them. */}
      <footer
        className={`mt-12 border-t border-line px-4 py-6 text-center text-sm text-stone print:hidden ${user ? TABS_ROOM : ""}`}
      >
        <p>This app uses an AI partner. It helps you think. You decide.</p>
        {/* Word for word from the lawyer, 24 October. The sentence lives in
            lib/legal.ts, so the same words appear everywhere it belongs. */}
        <p className="mt-2">{SELF_STUDY}</p>
      </footer>
    </div>
  );
}

/**
 * The three days between a withdrawal and the end of access (Terms §9).
 *
 * It says the date, and the one thing worth doing before it: take the
 * workbook. Shown on every page, because somebody in those three days should
 * not have to go looking for the news.
 */
function GraceBanner({ endsAt }: { endsAt: string | null }) {
  if (!endsAt) return null;
  const day = new Date(endsAt).toLocaleDateString("en-GB", { dateStyle: "long" });
  return (
    <div className="border-b border-line bg-ochre-soft px-4 py-3 text-center text-sm print:hidden">
      You withdrew from the contract, so your access ends on <strong>{day}</strong>. Download your workbook in{" "}
      <Link href="/settings" className="underline">
        My settings
      </Link>{" "}
      before then. If you have changed your mind, reply to the email we sent you.
    </div>
  );
}

/** Shows the page only for a signed-in person who finished onboarding. */
export function RequireUser({
  children,
  allowNoProfile = false,
}: {
  children: React.ReactNode;
  allowNoProfile?: boolean;
}) {
  const { loading, loadError, user, profile, reload } = useApp();
  const router = useRouter();
  // After a failed load we know nothing, so never redirect: show "Try again".
  const needsSignIn = !loading && !loadError && !user;
  const needsOnboarding = !loading && !loadError && user && !profile && !allowNoProfile;

  useEffect(() => {
    if (needsSignIn) router.replace("/signin");
    else if (needsOnboarding) router.replace("/onboarding");
  }, [needsSignIn, needsOnboarding, router]);

  if (!loading && loadError) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 text-center">
        <p className="font-semibold text-pine">We could not load your answers.</p>
        <p className="text-stone">Your answers are safe. Please check your internet and try again.</p>
        <button className="btn btn-primary" onClick={() => reload()}>
          Try again
        </button>
      </div>
    );
  }
  if (loading || needsSignIn || needsOnboarding) {
    return <p className="py-16 text-center text-stone">One moment…</p>;
  }
  return <>{children}</>;
}
