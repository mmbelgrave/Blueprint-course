// Builds the admin overview (brief 4.7): every participant with start date,
// progress per part, last activity, feedback and AI usage. No answer texts.
// Server-only; needs the service-role client.
import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateCostUsd } from "@/lib/admin-server";
import type { ExerciseStatus } from "@/lib/backend";
import { steps } from "@/lib/content";
import { partProgress } from "@/lib/progress";

type Row = Record<string, unknown>;
const latest = (a: string | null, b: string | null | undefined) => (!b ? a : !a || b > a ? b : a);

export async function buildOverview(admin: SupabaseClient) {
  const [users, profiles, statuses, answers, chats, feedback, usage] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("user_id, first_name, consent_ai, consent_founder_access, created_at"),
    admin.from("exercise_status").select("user_id, exercise_id, status, updated_at"),
    admin.from("answers").select("user_id, updated_at"),
    admin.from("conversations").select("user_id, created_at"),
    admin.from("feedback").select("user_id, part_id, rating, comment, created_at").order("created_at"),
    admin.from("usage_log").select("user_id, request_type, input_tokens, output_tokens, cache_read_tokens"),
  ]);
  for (const r of [profiles, statuses, answers, chats, feedback, usage]) {
    if (r.error) throw new Error(`Could not read the database: ${r.error.message}`);
  }
  if (users.error) throw new Error("Could not read the accounts.");

  const byUser = <T extends Row>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) {
      const id = r.user_id as string;
      if (!m.has(id)) m.set(id, []);
      m.get(id)!.push(r);
    }
    return m;
  };
  const statusBy = byUser(statuses.data);
  const answerBy = byUser(answers.data);
  const chatBy = byUser(chats.data);
  const feedbackBy = byUser(feedback.data);
  const usageBy = byUser(usage.data);
  const profileBy = new Map((profiles.data ?? []).map((p) => [p.user_id as string, p]));

  // Part names for the feedback list ("Step 1 · Part 2").
  const partName = new Map<string, string>();
  for (const s of steps) for (const p of s.parts) partName.set(p.id, `Step ${s.step.number} · ${p.label}`);

  const participants = users.data.users.map((u) => {
    const profile = profileBy.get(u.id);
    const st: Record<string, ExerciseStatus> = {};
    let last: string | null = u.last_sign_in_at ?? null;
    for (const r of statusBy.get(u.id) ?? []) {
      st[r.exercise_id as string] = r.status as ExerciseStatus;
      last = latest(last, r.updated_at as string);
    }
    for (const r of answerBy.get(u.id) ?? []) last = latest(last, r.updated_at as string);
    const userChats = chatBy.get(u.id) ?? [];
    for (const r of userChats) last = latest(last, r.created_at as string);

    const progress = steps.map((s) => ({
      step: s.step.number,
      title: s.step.title,
      parts: s.parts.map((p) => ({ label: p.label, optional: !!p.optional, ...partProgress(p, st) })),
    }));

    const u2 = usageBy.get(u.id) ?? [];
    const sum = (k: "input_tokens" | "output_tokens" | "cache_read_tokens") =>
      u2.reduce((t, r) => t + Number(r[k] ?? 0), 0);
    const inTok = sum("input_tokens");
    const outTok = sum("output_tokens");
    const cacheTok = sum("cache_read_tokens");
    const count = (prefix: string) => u2.filter((r) => String(r.request_type).startsWith(prefix)).length;

    return {
      id: u.id,
      email: u.email ?? "",
      name: (profile?.first_name as string) || "",
      started: (profile?.created_at as string) ?? u.created_at,
      lastActivity: last,
      consentFounder: !!profile?.consent_founder_access,
      consentAi: !!profile?.consent_ai,
      progress,
      feedback: (feedbackBy.get(u.id) ?? []).map((f) => ({
        part: partName.get(f.part_id as string) ?? (f.part_id as string),
        rating: f.rating as number | null,
        comment: (f.comment as string) ?? "",
        date: f.created_at as string,
      })),
      usage: {
        chatMessages: count("chat"),
        drafts: count("draft"),
        noteUpdates: count("profile"),
        inputTokens: inTok,
        outputTokens: outTok,
        cacheReadTokens: cacheTok,
        costUsd: estimateCostUsd(inTok, outTok, cacheTok),
      },
    };
  });

  participants.sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));
  return participants;
}

export type Participant = Awaited<ReturnType<typeof buildOverview>>[number];
