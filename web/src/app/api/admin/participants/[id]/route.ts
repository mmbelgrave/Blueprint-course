// One participant's answers and AI notes, read-only for the admin (brief 4.7):
// ONLY when that person ticked "Mwata may read my answers" — checked here, on the server.
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { answerText, exerciseAnswersText } from "@/lib/answer-text";
import { displayTitle, partItems, setupKey, steps } from "@/lib/content";
import { PROFILE_FIELDS, type AiProfile } from "@/lib/profile-fields";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/admin/participants/[id]">) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { admin } = auth;
  const { id } = await ctx.params;

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, consent_founder_access")
    .eq("user_id", id)
    .maybeSingle();
  if (!profile) return Response.json({ error: "This person was not found." }, { status: 404 });
  if (!profile.consent_founder_access) {
    return Response.json(
      { error: "This person did not give consent. You can see progress and feedback, not answers." },
      { status: 403 },
    );
  }

  const [answerRows, notesRow] = await Promise.all([
    admin.from("answers").select("exercise_id, field_id, value").eq("user_id", id),
    admin.from("ai_profile").select("profile, updated_at").eq("user_id", id).maybeSingle(),
  ]);
  const answers: Record<string, Record<string, unknown>> = {};
  for (const a of answerRows.data ?? []) (answers[a.exercise_id] ??= {})[a.field_id] = a.value;

  // Answers in workbook order: step → part → page. Only pages with text.
  const workbook = steps.map((s) => ({
    step: `Step ${s.step.number} · ${s.step.title}`,
    parts: s.parts
      .map((p) => {
        const setup = (p.setup?.fields ?? [])
          .map((f) => ({ label: f.label ?? f.id, text: answerText(f, answers[setupKey(p)]?.[f.id]) }))
          .filter((x) => x.text);
        const pages = partItems(p)
          .map((e) => ({ title: displayTitle(e), text: exerciseAnswersText(e.id, answers[e.id]) }))
          .filter((x) => x.text);
        return {
          part: `${p.label} · ${p.title}`,
          pages: [
            ...(setup.length ? [{ title: "Setup", text: setup.map((x) => `- ${x.label}: ${x.text}`).join("\n") }] : []),
            ...pages,
          ],
        };
      })
      .filter((p) => p.pages.length),
  }));

  const notes = (notesRow.data?.profile ?? {}) as AiProfile;
  const notesList = PROFILE_FIELDS.map((f) => ({
    label: f.label,
    value: notes[f.key] ?? (f.kind === "list" ? [] : ""),
    forgotten: !!notes._forgotten?.includes(f.key),
  })).filter((n) => !n.forgotten && (Array.isArray(n.value) ? n.value.length : n.value));

  return Response.json({
    name: profile.first_name,
    workbook,
    notes: notesList,
    notesUpdated: notesRow.data?.updated_at ?? null,
  });
}
