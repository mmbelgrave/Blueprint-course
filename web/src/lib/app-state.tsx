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
import type { Entitlement } from "@/lib/access";
import { AnswerSaver, type SaveState } from "@/lib/answer-saver";
import {
  fetchHousehold,
  saveSharedAnswer,
  saveSharedStatus,
  workingAlone,
  type Household,
} from "@/lib/household-client";
import { sharedAnswer, sharedStatus } from "@/lib/together-app";

type AppState = {
  loading: boolean;
  /** Loading the person's data failed; pages show a "Try again" button. */
  loadError: boolean;
  user: AppUser | null;
  profile: Profile | null;
  answers: Answers;
  statuses: Record<string, ExerciseStatus>;
  /** What this person owns. Empty is a free account, not a broken one. */
  entitlements: Entitlement[];
  saveState: SaveState;
  /** The household (§6.8). "alone" until somebody invites a partner. */
  household: Household;
  /**
   * Shared answers the other person wrote first, waiting to be settled.
   * Keyed "exercise/field". Nothing is thrown away: the page asks.
   */
  conflicts: Record<string, Conflict>;
  /** Keep mine, or take theirs. Either way the question is gone afterwards. */
  settle: (key: string, keep: "mine" | "theirs") => Promise<void>;
  /** Ask the server what the other person has done since. */
  refreshHousehold: () => Promise<void>;
  setAnswer: (exerciseId: string, fieldId: string, value: unknown) => void;
  /** Returns false when the change could not be saved (and was undone). */
  setStatus: (exerciseId: string, status: ExerciseStatus) => Promise<boolean>;
  saveProfile: (profile: Profile) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
};

/** One shared answer two people wrote at once, with both versions kept. */
export type Conflict = {
  exerciseId: string;
  fieldId: string;
  mine: unknown;
  theirs: unknown;
  /** Who wrote it first, when they have told us a name. */
  name: string | null;
  at: string | null;
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
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [household, setHousehold] = useState<Household>(() => workingAlone());
  const [conflicts, setConflicts] = useState<Record<string, Conflict>>({});

  const [saver] = useState(
    () =>
      new AnswerSaver(async (item) => {
        // Whether this answer is the household's was decided when it was
        // typed, so the saver needs to know nothing about households.
        if (item.shared) {
          const result = await saveSharedAnswer({
            exerciseId: item.exerciseId,
            fieldId: item.fieldId,
            value: item.value,
            loadedAt: item.shared.loadedAt,
          });
          // Written by the other person first. Not an error to try again: the
          // page is told, and it asks which answer to keep.
          if (!result.saved) {
            setConflicts((all) => ({
              ...all,
              [`${item.exerciseId}/${item.fieldId}`]: {
                exerciseId: item.exerciseId,
                fieldId: item.fieldId,
                mine: item.value,
                theirs: result.theirs,
                name: result.clash.name,
                at: result.clash.at,
              },
            }));
          }
          return;
        }
        await store.saveAnswer(item.userId, item.exerciseId, item.fieldId, item.value);
      }, setSaveState),
  );

  /**
   * What the household shares, laid over what this person has of their own.
   *
   * For the buyer this changes nothing: the shared answers are their own rows.
   * For the partner it is how the money table and the research arrive.
   */
  const applyHousehold = useCallback(
    async () => {
      const loaded = await fetchHousehold();
      if (!loaded) return;
      setHousehold(loaded.household);
      if (loaded.household.role === "alone") return;
      setAnswers((mine) => {
        const merged: Answers = { ...mine };
        for (const [exerciseId, fields] of Object.entries(loaded.answers)) {
          merged[exerciseId] = { ...merged[exerciseId], ...fields };
        }
        return merged;
      });
      setStatuses((mine) => ({ ...mine, ...loaded.statuses }));
      // A partner's access follows the buyer's, so the household's list wins.
      if (loaded.entitlements) setEntitlements(loaded.entitlements);
    },
    [setHousehold],
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
        setEntitlements(result.data.entitlements);
      }
    }
    setLoading(false);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    apply(await loadEverything());
    await applyHousehold();
  }, [apply, applyHousehold]);

  useEffect(() => {
    loadEverything()
      .then(apply)
      .then(() => applyHousehold());
  }, [apply, applyHousehold]);

  const setStatus = useCallback(
    async (exerciseId: string, status: ExerciseStatus) => {
      if (!user) return false;
      const before = statuses[exerciseId] ?? "not_started";
      setStatuses((s) => ({ ...s, [exerciseId]: status }));
      try {
        // A shared page is finished for both of them or for neither, so its
        // progress is stored once, with the shared answers on it.
        if (household.role !== "alone" && sharedStatus(exerciseId)) {
          await saveSharedStatus(exerciseId, status);
        } else {
          await store.setStatus(user.id, exerciseId, status);
        }
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
    [user, statuses, saver, profile, household.role],
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
      // An answer the household shares goes through the server, and carries
      // the moment this page last had the truth with it (spec 6.8).
      const shared = household.role !== "alone" && sharedAnswer(exerciseId, fieldId);
      saver.schedule({
        userId: user.id,
        exerciseId,
        fieldId,
        value,
        ...(shared ? { shared: { loadedAt: household.at } } : {}),
      });
    },
    [user, statuses, setStatus, saver, household.role, household.at],
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

  /**
   * Two people wrote the same box. Keep mine, or take theirs.
   *
   * "Mine" is saved over the top on purpose this time, which is what the person
   * just chose. "Theirs" puts their answer on the page, where it can still be
   * edited afterwards like any other.
   */
  const settle = useCallback(
    async (key: string, keep: "mine" | "theirs") => {
      const clash = conflicts[key];
      if (!clash) return;
      if (keep === "mine") {
        await saveSharedAnswer({
          exerciseId: clash.exerciseId,
          fieldId: clash.fieldId,
          value: clash.mine,
          loadedAt: household.at,
          force: true,
        }).catch(() => undefined);
      } else {
        setAnswers((all) => ({
          ...all,
          [clash.exerciseId]: { ...all[clash.exerciseId], [clash.fieldId]: clash.theirs },
        }));
      }
      setConflicts((all) => {
        const rest = { ...all };
        delete rest[key];
        return rest;
      });
    },
    [conflicts, household.at],
  );

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    setAnswers({});
    setStatuses({});
    setEntitlements([]);
    setHousehold(workingAlone());
    setConflicts({});
  }, [setHousehold]);

  return (
    <Ctx.Provider
      value={{
        loading,
        loadError,
        user,
        profile,
        answers,
        statuses,
        entitlements,
        saveState,
        household,
        conflicts,
        settle,
        refreshHousehold: applyHousehold,
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
