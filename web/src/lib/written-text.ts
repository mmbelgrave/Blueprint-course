/**
 * What somebody wrote, as a plain text file (spec §6.6).
 *
 * The app already shows two readable copies — "Everything I wrote" and the
 * step results — and both of them print. This turns the same material into a
 * .txt, for the person who wants the words themselves: to paste into an email
 * to a partner, to read on a phone with no internet, or simply to keep
 * somewhere that is not a browser.
 *
 * It is deliberately not the data export. /api/account/export hands over
 * everything the app holds, in JSON, because the privacy page promises a
 * machine-readable copy. This is the human one.
 *
 * Nothing is imported here: no React, no content files, no browser. The
 * shaping is all in these few functions so they can be read and tested on
 * their own, and the one function that touches a browser is kept apart at the
 * bottom where it is obvious.
 */

export type WrittenLine = { label: string; text: string };
export type WrittenPage = { title: string; lines: WrittenLine[] };
export type WrittenSection = { title: string; pages: WrittenPage[] };

/** A heading with a line of dashes under it, the width of the heading. */
const underline = (title: string, char = "=") => `${title}\n${char.repeat(title.length)}`;

/**
 * One document. Blank lines do the work that indentation does on screen: a
 * reader should be able to tell a question from an answer without colour.
 */
export function writtenText({
  title,
  who,
  when,
  note,
  sections,
  footer,
}: {
  title: string;
  /** Their first name, when the app knows it. */
  who?: string;
  /** The day it was made, already in words. */
  when: string;
  /** One line under the heading, when there is something to say. */
  note?: string;
  sections: WrittenSection[];
  footer?: string;
}): string {
  const out: string[] = [underline(title)];
  out.push([who, when].filter(Boolean).join(" · "));
  if (note) out.push("", note);

  for (const section of sections) {
    const pages = section.pages.filter((p) => p.lines.length > 0);
    if (pages.length === 0) continue;
    out.push("", "", underline(section.title, "-"));
    for (const page of pages) {
      out.push("", page.title);
      for (const line of page.lines) {
        // A label that only repeats the page name is noise on paper.
        out.push("");
        if (line.label !== page.title) out.push(`  ${line.label}`);
        out.push(...line.text.split("\n").map((l) => `    ${l}`));
      }
    }
  }

  if (sections.every((s) => s.pages.every((p) => p.lines.length === 0))) {
    out.push("", "You have not written anything yet.");
  }
  if (footer) out.push("", "", footer);
  return out.join("\n") + "\n";
}

/** "my-blueprint-everything-i-wrote-2026-10-09.txt" */
export function fileName(what: string, day = new Date()): string {
  const slug = what
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}-${day.toISOString().slice(0, 10)}.txt`;
}

/**
 * Hand the text to the browser as a file. The only part of this module that
 * knows a browser exists, so everything above it stays testable.
 */
export function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Let the click start before the link is thrown away.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
