/*
 * The workbook of one module, as a download (spec §6.9).
 *
 * The PDFs sit in a private place, so this hands out a link that works for a
 * few minutes and only for someone who may open that module. Whether the video
 * has been watched is not asked: the workbook is something people paid for, and
 * the website promises it on payment.
 */
import type { Entitlement } from "@/lib/access";
import { stepFor, itemFor } from "@/lib/access-app";
import { moduleById } from "@/lib/modules-app";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

/** Where the workbook PDFs live. Private: nothing is served by a plain link. */
const BUCKET = "workbooks";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in again.");

  const id = new URL(request.url).searchParams.get("module") ?? "";
  const course = moduleById(id);
  if (!course) return fail(404, "There is no such module.");
  if (!course.workbook?.file) return fail(404, "That workbook is not ready yet.");

  const { data: rows } = await supabase.from("entitlements").select("product, status");
  const entitlements = (rows ?? []) as Entitlement[];
  const verdict =
    course.step === undefined ? itemFor(course.id, entitlements) : stepFor(course.step, entitlements);
  if (!verdict.open) return fail(403, "This workbook is part of the course.");

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(course.workbook.file, 300, {
    download: `${course.workbook.name}.pdf`,
  });
  if (error || !data) return fail(502, "We could not fetch that workbook. Please try again.");

  return Response.redirect(data.signedUrl, 302);
}
