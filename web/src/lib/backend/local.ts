// Local preview mode: no accounts, everything stays in this browser only.
// Used when Supabase is not configured yet, so the workbook can be tried early.
import type { AuthProvider, DataStore, Feedback, UserData } from "./types";

const KEY = "blueprint-preview-v1";
const USER = { id: "local-preview", email: null };

type LocalData = UserData & { signedIn: boolean; feedback?: Record<string, Feedback> };

function read(): LocalData {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Storage blocked or corrupt: start empty.
  }
  return { signedIn: false, profile: null, answers: {}, statuses: {} };
}

/** Throws when the browser refuses to store, so the app can show "Not saved". */
function write(update: (d: ReturnType<typeof read>) => void) {
  const data = read();
  update(data);
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

export const localAuth: AuthProvider = {
  mode: "local",
  async getUser() {
    return read().signedIn ? USER : null;
  },
  async sendMagicLink() {
    write((d) => {
      d.signedIn = true;
    });
  },
  async signOut() {
    write((d) => {
      d.signedIn = false;
    });
  },
};

export const localStore: DataStore = {
  // Preview mode has no AI partner, so there is never a saved chat or profile.
  async loadConversation() {
    return [];
  },
  async loadAiProfile() {
    return null;
  },
  async saveAiProfile() {},
  async loadDraft() {
    return null;
  },
  // Feedback is kept in this browser, so the screen can be tried in preview mode.
  async loadFeedback(_userId, partId) {
    return read().feedback?.[partId] ?? null;
  },
  async saveFeedback(_userId, partId, feedback) {
    write((d) => {
      d.feedback = { ...d.feedback, [partId]: feedback };
    });
  },
  async load() {
    const { profile, answers, statuses } = read();
    return { profile, answers, statuses };
  },
  async saveProfile(_userId, profile) {
    write((d) => {
      d.profile = profile;
    });
  },
  async saveAnswer(_userId, exerciseId, fieldId, value) {
    write((d) => {
      d.answers[exerciseId] = { ...d.answers[exerciseId], [fieldId]: value };
    });
  },
  async setStatus(_userId, exerciseId, status) {
    write((d) => {
      d.statuses[exerciseId] = status;
    });
  },
};
