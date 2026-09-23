// Supabase implementation. Runs in the browser with the public (anon) key;
// row-level security in the database makes sure people only see their own rows.
import { createBrowserClient } from "@supabase/ssr";
import type {
  AuthProvider,
  ChatMessage,
  DataStore,
  ExerciseStatus,
  Profile,
  UserData,
} from "./types";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseBrowser() {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}

export const supabaseAuth: AuthProvider = {
  mode: "supabase",
  async getUser() {
    const { data, error } = await supabaseBrowser().auth.getUser();
    // "No session" means signed out; any other error (network) must not look like that.
    if (error && error.name !== "AuthSessionMissingError") throw error;
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  },
  async sendMagicLink(email) {
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  },
  async signOut() {
    await supabaseBrowser().auth.signOut();
  },
};

export const supabaseStore: DataStore = {
  async loadDraft(userId, pageId) {
    const { data, error } = await supabaseBrowser()
      .from("part_results")
      .select("ai_draft")
      .eq("user_id", userId)
      .eq("part_id", pageId)
      .maybeSingle();
    if (error) throw error;
    try {
      return data?.ai_draft ? (JSON.parse(data.ai_draft) as Record<string, string>) : null;
    } catch {
      return null;
    }
  },
  async loadFeedback(userId, partId) {
    const { data, error } = await supabaseBrowser()
      .from("feedback")
      .select("rating, comment")
      .eq("user_id", userId)
      .eq("part_id", partId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? { rating: data.rating, comment: data.comment ?? "" } : null;
  },
  async saveFeedback(userId, partId, feedback) {
    const { error } = await supabaseBrowser()
      .from("feedback")
      .insert({ user_id: userId, part_id: partId, rating: feedback.rating, comment: feedback.comment });
    if (error) throw error;
  },
  async loadAiProfile(userId) {
    const { data, error } = await supabaseBrowser()
      .from("ai_profile")
      .select("profile")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data?.profile as Record<string, unknown>) ?? null;
  },
  async saveAiProfile(userId, profile) {
    const { error } = await supabaseBrowser()
      .from("ai_profile")
      .upsert({ user_id: userId, profile, updated_at: new Date().toISOString() });
    if (error) throw error;
  },
  async loadConversation(_userId, exerciseId) {
    const { data, error } = await supabaseBrowser()
      .from("conversations")
      .select("role, content")
      .eq("exercise_id", exerciseId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ChatMessage[];
  },
  async load(userId) {
    const sb = supabaseBrowser();
    const [profile, answers, statuses] = await Promise.all([
      sb.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      sb.from("answers").select("exercise_id, field_id, value"),
      sb.from("exercise_status").select("exercise_id, status"),
    ]);
    for (const r of [profile, answers, statuses]) if (r.error) throw r.error;

    const data: UserData = { profile: null, answers: {}, statuses: {} };
    if (profile.data) {
      const p = profile.data;
      data.profile = {
        first_name: p.first_name ?? "",
        language: p.language,
        currency: p.currency,
        consent_ai: p.consent_ai,
        consent_founder_access: p.consent_founder_access,
      };
    }
    for (const a of answers.data ?? []) {
      (data.answers[a.exercise_id] ??= {})[a.field_id] = a.value;
    }
    for (const s of statuses.data ?? []) {
      data.statuses[s.exercise_id] = s.status as ExerciseStatus;
    }
    return data;
  },
  async saveProfile(userId, profile: Profile) {
    const { error } = await supabaseBrowser()
      .from("profiles")
      .upsert({ user_id: userId, ...profile });
    if (error) throw error;
  },
  async saveAnswer(userId, exerciseId, fieldId, value) {
    const { error } = await supabaseBrowser().from("answers").upsert({
      user_id: userId,
      exercise_id: exerciseId,
      field_id: fieldId,
      value,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },
  async setStatus(userId, exerciseId, status) {
    const { error } = await supabaseBrowser().from("exercise_status").upsert({
      user_id: userId,
      exercise_id: exerciseId,
      status,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },
};
