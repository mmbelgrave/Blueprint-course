"use client";
// Whether the signed-in person is the admin (asked once per page load; the
// server decides, and checks again on every admin request anyway).
import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/backend";

let cached: Promise<boolean> | null = null;

export function useIsAdmin(signedIn: boolean) {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!signedIn || !isSupabaseConfigured) return;
    cached ??= fetch("/api/admin/check")
      .then((r) => r.json())
      .then((b) => !!b.admin)
      .catch(() => false);
    let cancelled = false;
    cached.then((a) => !cancelled && setAdmin(a));
    return () => {
      cancelled = true;
    };
  }, [signedIn]);
  return admin;
}

/** Forget the answer (for example after signing out). */
export function resetIsAdmin() {
  cached = null;
}
