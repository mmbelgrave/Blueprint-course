/**
 * The sentences the lawyer wrote, word for word (review of 24 October 2026).
 *
 * They are here, in one file with no imports, because the same words have to
 * appear in several places and may not drift apart: a footer, the AI panel,
 * the first screen, the printed documents and every page that adds up money.
 * Change one of these and you are changing what was reviewed, so change it
 * here and nowhere else.
 */

/** Wherever the app says what the Blueprint is not. */
export const SELF_STUDY =
  "The Blueprint is self-study. It is not coaching, therapy, or legal, tax, immigration, financial, " +
  "medical or psychological advice, and it cannot promise any result.";

/** On every page that works something out from the person's own figures. */
export const MONEY_CHECK_NOTE =
  "This check uses the numbers you enter. It shows what your numbers say; it does not predict what will " +
  "happen. Prices, taxes and rules change. Before you commit money, for example by selling a home or " +
  "signing a contract, ask a qualified professional.";

/**
 * Who is responsible for the data, under the box that asks for an address.
 *
 * The last three words are a link to the privacy page, so the sentence is
 * written in two halves.
 */
export const DATA_CONTROLLER_NOTICE =
  "Belgrave Management, Unipessoal Lda is responsible for your data. We use your email address to send " +
  "you a sign-in code and to keep your answers with your account (our contract with you), and for " +
  "nothing else unless you tick the box below.";

/** The link text at the end of that sentence. */
export const PRIVACY_LINK_TEXT = "How we handle your data";

/** The optional tick beside it. */
export const UPDATES_BOX = "Also send me an occasional email when something new is ready. You can stop at any time.";

/**
 * The version of the updates wording, recorded with the tick.
 *
 * Bump it when the sentence above changes, so a record always says which
 * words the person actually read.
 */
export const UPDATES_WORDING_VERSION = "2026-10-24";
