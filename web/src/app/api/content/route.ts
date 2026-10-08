/*
 * The workbook text, handed out a page at a time (review round 4, finding 1).
 *
 * The words are the product, so they are sent to a browser only after the
 * access layer has said this person may have them — the same question the
 * workbook PDFs ask, asked about the same words inside the app.
 *
 *   ?page=1.2          one page, with its explanation, fields and boxes
 *   ?step=1            a step's welcome, route table, word help and sources
 *
 * A page that is free (1.2, the Ordinary Tuesday) opens inside a step nobody
 * has bought — that is what free access is for. Everything else needs the step.
 */
import type { Entitlement } from "@/lib/access";
import { pageFor, stepFor } from "@/lib/access-app";
import { myEntitlements } from "@/lib/access-server";
import { freePagesOf, fullStep, findPage, stepChrome } from "@/lib/content-server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pageId = params.get("page");
  const stepParam = params.get("step");

  /*
   * Preview mode is a sandbox someone runs on their own machine: no accounts,
   * no database, nothing of anyone's to protect. It is also the only way to
   * show the app without signing in, so it answers in full. Every deployed
   * build has Supabase configured and takes the path below.
   */
  const open = !process.env.NEXT_PUBLIC_SUPABASE_URL;

  let entitlements: Entitlement[] = [];
  if (!open) {
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return fail(401, "Please sign in again.");
    // Read with the person's own session, so row-level security still decides.
    entitlements = await myEntitlements(supabase);
  }

  if (pageId) {
    const found = findPage(pageId);
    if (!found) return fail(404, "There is no such page.");
    const step = found.step.step.number;
    const verdict = pageFor(pageId, step, entitlements);
    if (!open && !verdict.open) {
      return fail(403, verdict.why === "not-released" ? "This step is not open yet." : "This page is part of the course.");
    }
    const { exercises, summary, ...partWithoutItsPages } = found.part;
    void exercises;
    void summary;
    return Response.json(
      { step, part: partWithoutItsPages, exercise: found.exercise },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const number = Number(stepParam);
  if (!Number.isInteger(number) || number < 1) return fail(400, "That is not a step.");
  const verdict = stepFor(number, entitlements);
  const mine = open || verdict.open;

  /*
   * The whole step, for the screens that show more than one page at once: the
   * overview, the printed result, the Blueprint and "Everything I wrote".
   *
   * Somebody who does not own the step still gets the pages that are free, so
   * their own answers read back to them with the questions attached. They get
   * nothing else — not the other pages, not the step's own welcome.
   */
  if (params.get("full") === "1") {
    const full = fullStep(number);
    if (!full) return fail(404, "There is no such step.");
    if (mine) return Response.json(full, { headers: { "cache-control": "no-store" } });
    if (verdict.why === "not-released") return fail(403, "This step is not open yet.");

    const freeOnly = freePagesOf(number);
    if (freeOnly.parts.length === 0) return fail(403, "This step is part of the course.");
    return Response.json(freeOnly, { headers: { "cache-control": "no-store" } });
  }

  if (!mine) {
    return fail(403, verdict.why === "not-released" ? "This step is not open yet." : "This step is part of the course.");
  }
  const chrome = stepChrome(number);
  if (!chrome) return fail(404, "There is no such step.");
  return Response.json(chrome, { headers: { "cache-control": "no-store" } });
}
