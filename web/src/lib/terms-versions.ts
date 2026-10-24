/**
 * Every version of the terms, with the day it started applying.
 *
 * A buyer is given the terms on a durable medium, in the version that applied
 * on the day they bought (lawyer, 24 October). A link is not durable, because
 * the page changes, so each version is printed once with
 * `node scripts/print-terms.cjs <date>` and kept under public/terms for ever.
 *
 * To add one: print it, then add a line here, newest last. A test checks that
 * every version listed has its file and every file is listed.
 *
 * Nothing is imported here, so the rule can be tested on its own.
 */

export type TermsVersion = {
  /** How the version is named to a buyer: "24 October 2026". */
  version: string;
  /** The first day it applied, as YYYY-MM-DD. */
  from: string;
  /** The file under public/terms. */
  file: string;
};

export const TERMS_VERSIONS: TermsVersion[] = [
  { version: "24 October 2026", from: "2026-10-24", file: "terms-2026-10-24.pdf" },
];

/**
 * The version that applied on a given day, or null for a day before the first
 * one was kept. A purchase from before that gets its confirmation without an
 * attachment, and says so, rather than being sent the wrong terms.
 */
export function termsFor(when: Date | string): TermsVersion | null {
  const day = new Date(when).toISOString().slice(0, 10);
  const applied = TERMS_VERSIONS.filter((t) => t.from <= day).sort((a, b) => a.from.localeCompare(b.from));
  return applied.length ? applied[applied.length - 1] : null;
}

/** Where that file is served from, given the app's own address. */
export const termsUrl = (appUrl: string, version: TermsVersion) =>
  `${appUrl.replace(/\/$/, "")}/terms/${version.file}`;
