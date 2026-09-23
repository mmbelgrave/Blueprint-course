export type ExerciseStatus = "not_started" | "in_progress" | "done";

export type AppUser = { id: string; email: string | null };

export type Profile = {
  first_name: string;
  language: string;
  currency: string;
  consent_ai: boolean;
  consent_founder_access: boolean;
};

/** answers[exerciseId][fieldId] = value */
export type Answers = Record<string, Record<string, unknown>>;

export type UserData = {
  profile: Profile | null;
  answers: Answers;
  statuses: Record<string, ExerciseStatus>;
};

/**
 * Sign-in lives behind this one interface, so a different login provider
 * (for example Whop) can replace Supabase later without touching the pages.
 */
/**
 * Thrown by sendMagicLink when the pilot is invite-only and this email was
 * not invited. The sign-in page then says so instead of "something went wrong".
 */
export class NotInvitedError extends Error {
  constructor() {
    super("This email is not on the pilot list.");
    this.name = "NotInvitedError";
  }
}

export interface AuthProvider {
  mode: "supabase" | "local";
  getUser(): Promise<AppUser | null>;
  sendMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Feedback = { rating: number | null; comment: string };

export interface DataStore {
  /** The AI partner's last draft for a summary page, per box (null when none). */
  loadDraft(userId: string, pageId: string): Promise<Record<string, string> | null>;
  /** The person's latest answer to "How did this part feel?" (null when none). */
  loadFeedback(userId: string, partId: string): Promise<Feedback | null>;
  saveFeedback(userId: string, partId: string, feedback: Feedback): Promise<void>;
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
