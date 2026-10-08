/*
 * A workbook, to open or to download (spec §6.9).
 *
 * The PDFs sit in a private place, so this hands out a link that works for a
 * few minutes and only for someone who may open that step. Whether the video
 * has been watched is never asked: the workbook is something people paid for,
 * and the website promises it on payment.
 *
 *   ?step=step-1        a step's workbook
 *   ?module=introduction  a module that carries its own (the Introduction)
 *   &open=1             opens in the browser instead of downloading
 */
import type { Entitlement } from "@/lib/access";
import { ownedSteps } from "@/lib/access";
import { accessConfig, requirePurchase } from "@/lib/access-app";
import { isFreeAccount, myEntitlements } from "@/lib/access-server";
import { freeItemById, moduleById, workbookOf } from "@/lib/modules-app";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

/** Where the workbook PDFs live. Private: nothing is served by a plain link. */
const BUCKET = "workbooks";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in again.");

  const params = new URL(request.url).searchParams;
  const stepId = params.get("step");
  const moduleId = params.get("module");
  const freeId = params.get("free");
  const asDownload = params.get("open") !== "1";

  // A free exercise is a PDF like any other, and belongs to nobody in particular.
  const freeItem = freeId ? freeItemById(freeId) : undefined;
  const workbook = freeItem
    ? { name: freeItem.title, file: freeItem.pdf ?? null, updated: null }
    : stepId
      ? workbookOf(stepId)
      : moduleId
        ? moduleById(moduleId)?.workbook
        : undefined;
  if (!workbook) return fail(404, "There is no such workbook.");
  if (!workbook.file) return fail(404, "That workbook is not ready yet.");

  // A module's own workbook (the Introduction) comes with the course: a free
  // account is welcome to the video, and to the free exercises as PDFs.
  if (moduleId && isFreeAccount(await myEntitlements(supabase))) {
    return fail(403, "The workbook comes with the course.");
  }

  // A step's workbook belongs to the step.
  if (stepId && requirePurchase) {
    const number = Number(stepId.replace("step-", ""));
    const { data: rows } = await supabase.from("entitlements").select("product, status");
    const mine = ownedSteps((rows ?? []) as Entitlement[], accessConfig);
    if (!mine.includes(number)) return fail(403, "This workbook is part of the course.");
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(workbook.file, 300, asDownload ? { download: `${workbook.name}.pdf` } : {});
  if (error || !data) return fail(502, "We could not fetch that workbook. Please try again.");

  return Response.redirect(data.signedUrl, 302);
}
