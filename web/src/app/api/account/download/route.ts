/*
 * Everything somebody wrote, in one file they can keep (spec §6.6).
 *
 * Until today the download was words only: the pictures from 1.2 were listed
 * by their file names and left behind, which for some people is half of that
 * page (Mwata, 24 October). This hands over a zip:
 *
 *   Everything I wrote.txt   the readable copy, the same one the page prints
 *   everything.json          the machine-readable copy the privacy note owes
 *   pictures/1.2/*.jpg       the pictures themselves, in a folder
 *
 * Each person gets their own pictures and nobody else's: a picture lives in
 * a folder named after its owner's account, the store allows a person into
 * their own folder only, and this route reads it as them rather than with the
 * service key. In a household the board is a personal page, so two people
 * downloading on the same day get two different folders of pictures.
 */
import { displayTitle, partItems, PRODUCT } from "@/lib/content";
import { allSteps, answerLinesOf } from "@/lib/content-server";
import { sessionUser, supabaseServer } from "@/lib/supabase-server";
import { fileName, writtenText } from "@/lib/written-text";
import { zip, type ZipEntry } from "@/lib/zip";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return fail(503, "That is not set up yet.");
  const supabase = await supabaseServer();
  const auth = await sessionUser(supabase);
  if (!auth.user) return fail(401, "Please sign in again.");
  const user = auth.user;

  const [profile, answers, statuses, aiProfile, results, conversations, entitlements, questions, feedback] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("answers").select("exercise_id, field_id, value, updated_at"),
      supabase.from("exercise_status").select("exercise_id, status, updated_at"),
      supabase.from("ai_profile").select("profile, updated_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("part_results").select("part_id, ai_draft, final_text, updated_at"),
      supabase.from("conversations").select("exercise_id, role, content, created_at").order("created_at"),
      supabase.from("entitlements").select("product, status, source, order_id, created_at, ended_at"),
      supabase.from("questions").select("topic, page, question, created_at").order("created_at"),
      supabase.from("feedback").select("part_id, rating, comment, created_at").order("created_at"),
    ]);

  /* The answers, as the pages hold them: one bag of fields per page. */
  const byPage = new Map<string, Record<string, unknown>>();
  for (const row of (answers.data ?? []) as { exercise_id: string; field_id: string; value: unknown }[]) {
    const page = byPage.get(row.exercise_id) ?? {};
    page[row.field_id] = row.value;
    byPage.set(row.exercise_id, page);
  }

  const done = ((statuses.data ?? []) as { status: string }[]).filter((s) => s.status === "done").length;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  /*
   * The readable copy, step by step and part by part, skipping anything with
   * nothing written on it: an empty page in a 70-page document is noise.
   */
  const sections = allSteps().flatMap((step) =>
    step.parts
      .map((part) => {
        const pages = partItems(part)
          .map((page) => ({ page, lines: answerLinesOf(page.id, byPage.get(page.id), "\n") }))
          .filter((p) => p.lines.length > 0);
        return {
          title: `Step ${step.step.number} · ${step.step.title} — ${part.label} · ${part.title}`,
          pages: pages.map(({ page, lines }) => ({ title: displayTitle(page), lines })),
        };
      })
      .filter((s) => s.pages.length > 0),
  );

  const text = writtenText({
    title: `${PRODUCT.name} — Everything I wrote`,
    who: (profile.data?.first_name as string) || undefined,
    when: today,
    note: `${done} ${done === 1 ? "page" : "pages"} marked done.`,
    sections,
    footer: `© ${new Date().getFullYear()} ${PRODUCT.copyright_holder} · ${PRODUCT.name}. Your answers are your own. This copy is for your personal use; the workbook text and layout may not be copied or shared.`,
  });

  const everything = {
    note: "Everything The Made Real Blueprint holds about you, on the day you asked for it. Your answers are your own.",
    taken_on: new Date().toISOString(),
    account: { email: user.email ?? null },
    profile: profile.data ?? null,
    answers: answers.data ?? [],
    pages_done: statuses.data ?? [],
    what_my_ai_partner_knows: aiProfile.data?.profile ?? null,
    results: results.data ?? [],
    chats_with_my_ai_partner: conversations.data ?? [],
    what_i_bought: entitlements.data ?? [],
    questions_i_asked: questions.data ?? [],
    feedback_i_gave: feedback.data ?? [],
    pictures: "In the pictures folder of this zip.",
  };

  const entries: ZipEntry[] = [
    { name: "Everything I wrote.txt", bytes: new TextEncoder().encode(text) },
    { name: "everything.json", bytes: new TextEncoder().encode(JSON.stringify(everything, null, 2)) },
  ];

  /*
   * The pictures. Read as the person, so the store's own rule decides what
   * they may have, and allowed to fail quietly: a download that refuses
   * because one picture is missing helps nobody, and the text and the data
   * are the part the privacy note promises.
   */
  let missed = 0;
  try {
    const { data: pages } = await supabase.storage.from("boards").list(user.id);
    for (const page of pages ?? []) {
      const { data: files } = await supabase.storage.from("boards").list(`${user.id}/${page.name}`);
      for (const file of files ?? []) {
        const path = `${user.id}/${page.name}/${file.name}`;
        const { data: blob, error } = await supabase.storage.from("boards").download(path);
        if (error || !blob) {
          missed += 1;
          continue;
        }
        entries.push({ name: `pictures/${page.name}/${file.name}`, bytes: new Uint8Array(await blob.arrayBuffer()) });
      }
    }
  } catch {
    // The store was unreachable. The words still go.
  }
  if (missed > 0) {
    entries.push({
      name: "pictures/NOTE.txt",
      bytes: new TextEncoder().encode(
        `${missed} picture${missed === 1 ? "" : "s"} could not be read when this was made.\n` +
          "Nothing was deleted. Ask again later, or write to info@maderealblueprint.com.\n",
      ),
    });
  }

  const bytes = zip(entries);
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${fileName("everything I wrote", new Date(), "zip")}"`,
      "cache-control": "no-store",
    },
  });
}
