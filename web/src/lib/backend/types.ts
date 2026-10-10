import type { Entitlement } from "@/lib/access";

export type ExerciseStatus = "not_started" | "in_progress" | "done";

export type AppUser = { id: string; email: string | null };

export type Profile = {
  first_name: string;
  language: string;
  currency: string;
  consent_ai: boolean;
  consent_founder_access: boolean;
  /** Where the sign-up link was shared (§6.2). Null when we do not know. */
  came_from?: string | null;
  /** "Send me an occasional update." Recorded only; nothing is sent yet. */
  wants_updates?: boolean;
};

/** answers[exerciseId][fieldId] = value */
export type Answers = Record<string, Record<string, unknown>>;

export type UserData = {
  profile: Profile | null;
  answers: Answers;
  statuses: Record<string, ExerciseStatus>;
  /** What this person has bought or been given (§6.1). Empty means free access. */
  entitlements: Entitlement[];
};

/**
 * Sign-in lives behind this one interface, so a different login provider
 * (for example Whop) can replace Supabase later without touching the pages.
 */
/**
 * Thrown by sendMagicLink when new accounts are switched off and this address
 * has none. The sign-in page then says so instead of "something went wrong".
 */
export class NotInvitedError extends Error {
  constructor() {
    super("This address cannot start an account right now.");
    this.name = "NotInvitedError";
  }
}

export interface AuthProvider {
  mode: "supabase" | "local";
  getUser(): Promise<AppUser | null>;
  /** Sends the email that carries both a code and a link. */
  sendMagicLink(email: string): Promise<void>;
  /**
   * Signs in with the code from that email. A mail scanner (Outlook Safe Links)
   * opens the link before the person does and uses it up; it cannot use a code.
   */
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Feedback = { rating: number | null; comment: string };

/** "Was this page clear?" — the smaller question, on every exercise page (6.7). */
export type PageNote = { clear: boolean; comment: string };

export interface DataStore {
  /** The AI partner's last draft for a summary page, per box (null when none). */
  loadDraft(userId: string, pageId: string): Promise<Record<string, string> | null>;
  /** The person's latest answer to "How did this part feel?" (null when none). */
  loadFeedback(userId: string, partId: string): Promise<Feedback | null>;
  saveFeedback(userId: string, partId: string, feedback: Feedback): Promise<void>;
  /** Whether this page was clear to them, and what was missing (null when unasked). */
  loadPageNote(userId: string, exerciseId: string): Promise<PageNote | null>;
  savePageNote(userId: string, exerciseId: string, note: PageNote): Promise<void>;
  /** What the AI partner knows (null in preview mode or when nothing is known yet). */
  loadAiProfile(userId: string): Promise<Record<string, unknown> | null>;
  saveAiProfile(userId: string, profile: Record<string, unknown>): Promise<void>;
  /** The saved chat with the AI partner on one page, oldest first. */
  loadConversation(userId: string, exerciseId: string): Promise<ChatMessage[]>;
  load(userId: string): Promise<UserData>;
  saveProfile(userId: string, profile: Profile): Promise<void>;
  saveAnswer(
    userId: string,
    exerciseId: string,
    fieldId: string,
    value: unknown,
  ): Promise<void>;
  setStatus(
    userId: string,
    exerciseId: string,
    status: ExerciseStatus,
  ): Promise<void>;
}
