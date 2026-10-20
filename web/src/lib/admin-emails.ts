/**
 * Who may open /admin, read from ADMIN_EMAIL.
 *
 * One address is the normal case. More than one, separated by commas, is for
 * moving the admin from one address to another without a gap in between
 * (Mwata, 20 October). Nothing set is nobody, never everybody.
 *
 * On its own, with no imports, so the rule can be tested without a server.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
