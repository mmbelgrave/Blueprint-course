/**
 * The letter the invited partner gets (spec §6.8).
 *
 * It has to do four things in a few lines: say who invited them, say that
 * their answers are their own, say how to get in, and tell them what happens
 * with their data before they decide to sign in at all (lawyer, 24 October,
 * item B4a). No link to sign in: §3.1 says the code is asked for, never sent.
 *
 * The privacy lines are the same facts as the privacy note, shortened: who is
 * responsible, what is kept, who sees what, how long an invitation stands,
 * and where to read the rest.
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
    `You get your own version of the exercises. Some exercises you fill in`,
    `together in ${who}'s app, such as the money and the research. These will be`,
    "prefilled in your app already. Other pages you each answer on your own and",
    "you can compare your answers once both have completed the relevant",
    "exercise.",
    "",
    "About your data",
    "",
    "Belgrave Management, Unipessoal Lda (The Life You Choose), NIPC 518428338,",
    "Rua Doutora Maria Adelaide Moura Ferreira, s/n, Passarela, 6290-093",
    "Lagarinhos, Gouveia, Portugal, info@maderealblueprint.com, is responsible",
    "for your data.",
    "",
    `If you sign in, we keep your answers, the pictures you add and your chats`,
    "with your AI partner in your own account. The pages you answer together",
    `are shared: ${who} can read and change those, and you can read and change`,
    `theirs. The pages you each answer alone stay yours, and ${who} sees them`,
    "only once you have both written. Your AI partner is optional and off until",
    "you switch it on.",
    "",
    "We use this address for this invitation and for your sign-in codes, and for",
    "nothing else. If you do nothing, the invitation and this address are",
    "deleted after 30 days.",
    "",
    `The full privacy note is at ${o.appUrl}/privacy.`,
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
