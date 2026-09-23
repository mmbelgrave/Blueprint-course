"use client";
// One place that loads the signed-in person's data and saves changes.
// Answers are saved automatically, a short moment after typing stops.
// "Saved" is only shown when nothing is waiting, sending or failed.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  auth,
  isSupabaseConfigured,
  store,
  type AppUser,
  type Answers,
  type ExerciseStatus,
  type Profile,
  type UserData,
} from "@/lib/backend";
import { AnswerSaver, type SaveState } from "@/lib/answer-saver";

type AppState = {
  loading: boolean;
  /** Loading the person's data failed; pages show a "Try again" button. */
  loadError: boolean;
  user: AppUser | null;
  profile: Profile | null;
  answers: Answers;
  statuses: Record<string, ExerciseStatus>;
  saveState: SaveState;
  setAnswer: (exerciseId: string, fieldId: string, value: unknown) => void;
  /** Returns false when the change could not be saved (and was undone). */
  setStatus: (exerciseId: string, status: ExerciseStatus) => Promise<boolean>;
  saveProfile: (profile: Profile) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

type Loaded = { user: AppUser | null; data: UserData | null } | "error";

async function loadEverything(): Promise<Loaded> {
  try {
    const user = await auth.getUser();
    return { user, data: user ? await store.load(user.id) : null };
  } catch {
    return "error";
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [statuses, setStatuses] = useState<Record<string, ExerciseStatus>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saver] = useState(
    () =>
      new AnswerSaver(
        (item) => store.saveAnswer(item.userId, item.exerciseId, item.fieldId, item.value),
        setSaveState,
      ),
  );

  const apply = useCallback((result: Loaded) => {
    if (result === "error") {
      setLoadError(true);
    } else {
      setLoadError(false);
      setUser(result.user);
      if (result.data) {
        setProfile(result.data.profile);
        setAnswers(result.data.answers);
        setStatuses(result.data.statuses);
      }
    }
    setLoading(false);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    apply(await loadEverything());
  }, [apply]);

  useEffect(() => {
    loadEverything().then(apply);
  }, [apply]);

  const setStatus = useCallback(
    async (exerciseId: string, status: ExerciseStatus) => {
      if (!user) return false;
      const before = statuses[exerciseId] ?? "not_started";
      setStatuses((s) => ({ ...s, [exerciseId]: status }));
      try {
        await store.setStatus(user.id, exerciseId, status);
        if (status === "done" && isSupabaseConfigured && profile?.consent_ai) {
          // Let the partner update what it knows — after every typed answer is stored.
          // In the background: the person does not wait for it, and a failure is harmless.
          saver
            .flush()
            .then(() => fetch("/api/profile", { method: "POST" }))
            .catch(() => {});
        }
        return true;
      } catch {
        setStatuses((s) => ({ ...s, [exerciseId]: before }));
        return false;
      }
    },
    [user, statuses, saver, profile],
  );

  const setAnswer = useCallback(
    (exerciseId: string, fieldId: string, value: unknown) => {
      if (!user) return;
      setAnswers((a) => ({
        ...a,
        [exerciseId]: { ...a[exerciseId], [fieldId]: value },
      }));
      if ((statuses[exerciseId] ?? "not_started") === "not_started") {
        setStatus(exerciseId, "in_progress");
      }
      saver.schedule({ userId: user.id, exerciseId, fieldId, value });
    },
    [user, statuses, setStatus, saver],
  );

  useEffect(() => {
    // Try failed saves again as soon as the internet is back.
    const onOnline = () => saver.retryFailed();
    // Warn before closing the tab while anything is not stored yet.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saver.hasUnsaved) e.preventDefault();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [saver]);

  const saveProfile = useCallback(
    async (p: Profile) => {
      if (!user) return;
      await store.saveProfile(user.id, p);
      setProfile(p);
    },
    [user],
  );

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    setAnswers({});
    setStatuses({});
  }, []);

  return (
    <Ctx.Provider
      value={{
        loading,
        loadError,
        user,
        profile,
        answers,
        statuses,
        saveState,
        setAnswer,
        setStatus,
        saveProfile,
        signOut,
        reload,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
