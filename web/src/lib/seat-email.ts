/**
 * The letter the invited partner gets (spec §6.8).
 *
 * It has to do three things in a few lines: say who invited them, say that
 * their answers are their own, and say how to get in. No link: §3.1 says the
 * code is asked for, never sent.
 */
export function seatInvitation(o: {
  fromName?: string | null;
  fromEmail: string;
  email: string;
  appUrl: string;
  productName: string;
}) {
  const who = o.fromName?.trim() || o.fromEmail;
  const text = [
    "Hello,",
    "",
    `${who} has invited you to join ${o.productName} as their partner.`,
    "",
    `Go to ${o.appUrl} and sign in with this email address:`,
    o.email,
    "",
    "There is no password: you ask for a code, it arrives in your mailbox",
    "(check your spam folder), and you type it in.",
    "",
    "You get your own version of the exercises. Some you fill in together, such",
    `as the money and the research, and those are already filled in where ${who}`,
    "has done them. The others you each answer on your own, and you can compare",
    "your answers once you have both finished that exercise.",
    "",
    "Mwata",
    "The Made Real Blueprint",
  ].join("\n");
  return { subject: `${who} has invited you to ${o.productName}`, text };
}

/** What the buyer sees in Settings once the letter has gone. */
export function seatSentNote(email: string) {
  return `The invitation is on its way to ${email}. They can sign in whenever they like.`;
}
