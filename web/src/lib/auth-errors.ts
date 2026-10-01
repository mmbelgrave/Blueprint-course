/**
 * What a person reads when signing in goes wrong. Supabase answers in its own
 * words ("Token has expired or is invalid", "For security purposes, you can
 * only request this after 54 seconds"), which helps nobody at the door.
 * Kept apart from the sign-in code so it can be tested on its own.
 */
export function friendlySignInError(raw: string): string {
  const m = (raw ?? "").toLowerCase();

  if (m.includes("expired") || m.includes("invalid") || m.includes("not found")) {
    return "That code is wrong, or it has expired. Codes last one hour. Ask for a new one below.";
  }
  // "For security purposes, you can only request this after 54 seconds."
  const wait = m.match(/after (\d+) seconds?/);
  if (wait) {
    return `Please wait ${wait[1]} seconds before asking for a new code.`;
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many tries for now. Please wait a few minutes and try again.";
  }
  if (m.includes("network") || m.includes("failed to fetch") || m.includes("timeout")) {
    return "We could not reach the server. Please check your internet and try again.";
  }
  return "Something went wrong. Please try again in a minute.";
}

/** Only six digits are worth sending: people paste "123 456" or "code: 123456". */
export const cleanCode = (typed: string) => (typed ?? "").replace(/\D/g, "").slice(0, 6);
