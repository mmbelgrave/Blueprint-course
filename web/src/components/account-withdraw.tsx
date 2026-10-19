"use client";
/**
 * The withdrawal section in Settings (Terms §9).
 *
 * Reachable without having to look for it, which is the point of the law: it
 * sits in Settings under the account, next to the export and the delete, and
 * it shows the purchase so nobody has to go and find a receipt.
 *
 * A free account sees nothing, because there is nothing to withdraw from.
 */
import { useEffect, useState } from "react";
import { WithdrawCard, type Done, type Purchase } from "@/components/withdraw-card";

type Mine = { signedIn: boolean; purchase: Purchase | null; already?: Done | null };

export function AccountWithdraw() {
  const [mine, setMine] = useState<Mine | null>(null);

  useEffect(() => {
    let gone = false;
    fetch("/api/withdraw", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!gone && data) setMine(data);
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, []);

  if (!mine?.signedIn || (!mine.purchase && !mine.already)) return null;

  return (
    <div className="mt-8 border-t border-line pt-8">
      <h2 className="text-xl font-semibold text-pine">Withdraw from contract</h2>
      <p className="mt-1 text-sm text-stone">
        Within 14 days of buying you may withdraw without giving a reason, and we refund the full price. After that,
        our 30-day guarantee gives you the same thing.
      </p>
      <div className="mt-3">
        <WithdrawCard purchase={mine.purchase} already={mine.already ?? null} />
      </div>
    </div>
  );
}
