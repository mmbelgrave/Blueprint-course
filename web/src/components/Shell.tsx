"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Lockup } from "@/components/brand";
import { useApp } from "@/lib/app-state";
import { isSupabaseConfigured } from "@/lib/backend";
import { PRODUCT } from "@/lib/content";
import { resetIsAdmin, useIsAdmin } from "@/lib/use-is-admin";

export function Shell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  const { user, signOut } = useApp();
  const router = useRouter();
  const isAdmin = useIsAdmin(!!user);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {!isSupabaseConfigured && (
        <div className="bg-ochre px-4 py-1.5 text-center text-sm text-white print:hidden">
          Preview mode — no account. Your answers are saved in this browser only.
        </div>
      )}
      <header className="border-b border-line bg-sand print:hidden">
        <div
          className={`mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 ${wide ? "max-w-7xl" : "max-w-4xl"}`}
        >
          <Link href={user ? "/dashboard" : "/"} aria-label={`${PRODUCT.name} — ${PRODUCT.edition}`}>
            <Lockup />
          </Link>
          {user && (
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <Link href="/dashboard" className="text-pine hover:underline">
                Overview
              </Link>
              <Link href="/me" className="text-pine hover:underline">
                <span className="hidden sm:inline">What my AI partner knows</span>
                <span className="sm:hidden">My notes</span>
              </Link>
              <Link href="/settings" className="text-pine hover:underline">
                Settings
              </Link>
              {isAdmin && (
                <Link href="/admin" className="font-semibold text-ochre hover:underline">
                  Admin
                </Link>
              )}
              <button
                className="text-stone hover:underline"
                onClick={async () => {
                  resetIsAdmin();
                  await signOut();
                  router.push("/");
                }}
              >
                Sign out
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-8 ${wide ? "max-w-7xl" : "max-w-4xl"}`}>
        {children}
      </main>
      <footer className="border-t border-line px-4 py-4 text-center text-sm text-stone print:hidden">
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        <span className="mx-2">·</span>
        This app uses an AI partner. It helps you think. You decide.
      </footer>
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
