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
  SessionGoneError,
  store,
  type AppUser,
  type Answers,
  type ExerciseStatus,
  type Profile,
  type UserData,
} from "@/lib/backend";
import { aiConsentIsOn } from "@/components/ai-consent";
import type { Entitlement } from "@/lib/access";
import { AnswerSaver, type SaveState } from "@/lib/answer-saver";
import {
  fetchHousehold,
  forgetHousehold,
  knownHousehold,
  markSeen,
  rememberHousehold,
  saveSharedAnswer,
  saveSharedStatus,
  seenAt,
  workingAlone,
  type Household,
  type HouseholdLoad,
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
  /** Keep mine, or take theirs. The other answer stays recoverable. */
  settle: (key: string, keep: "mine" | "theirs") => Promise<void>;
  /** Done with the question; the other answer is let go. */
  dismissConflict: (key: string) => void;
  /** Has the household been asked successfully? Unknown is not alone. */
  householdKnown: boolean;
  /** Ask the server what the other person has done since. True when it answered. */
  refreshHousehold: () => Promise<boolean>;
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
  /** Which answer was chosen, while the other one is still recoverable. */
  settled?: "mine" | "theirs";
};

const Ctx = createContext<AppState | null>(null);

type Loaded = { user: AppUser | null; data: UserData | null } | "error";

/*
 * Everything this person has, at startup.
 *
 * One failed request used to be enough for "We could not load your answers",
 * which is a frightening screen for a hiccup: a sleeping database, a train
 * tunnel, a phone changing network. So it asks twice, a second apart, and
 * only then says so. Nothing is written here, so asking again is free.
 */
async function loadEverything(): Promise<Loaded> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const user = await auth.getUser();
      return { user, data: user ? await store.load(user.id) : null };
    } catch (e) {
      // A sign-in that has run out is not a failure to load: the person is
      // signed out, and the sign-in page is where they can do something.
      if (e instanceof SessionGoneError) return { user: null, data: null };
      if (attempt === 0) await new Promise((wait) => setTimeout(wait, 900));
    }
  }
  return "error";
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
  /* Whether the household has been asked successfully at all. Unknown is not
     the same as alone, and nothing shared is written while it is unknown. */
  const [householdKnown, setHouseholdKnown] = useState(false);
  const [conflicts, setConflicts] = useState<Record<string, Conflict>>({});

  const [saver] = useState(
    () =>
      new AnswerSaver(async (item) => {
        /*
         * Whose answer this is gets decided here, when it is actually sent,
         * and not when it was typed (review round 6, R6-1). At startup, and
         * after a request that did not arrive, the household is simply not
         * known yet; throwing leaves the answer in the queue, keeps the page
         * honest about not having saved it, and the saver tries again in a few
         * seconds. The one thing it must not do is write a household's answer
         * to one person's own rows.
         */
        const house = knownHousehold();
        if (!house) throw new Error("the household is not known yet");

        if (house.role !== "alone" && sharedAnswer(item.exerciseId, item.fieldId)) {
          const key = `${item.exerciseId}/${item.fieldId}`;
          const result = await saveSharedAnswer({
            exerciseId: item.exerciseId,
            fieldId: item.fieldId,
            value: item.value,
            loadedAt: seenAt(key),
          });
          // Written by the other person first. Not an error to try again: the
          // page is told, and it asks which answer to keep.
          if (!result.saved) {
            setConflicts((all) => ({
              ...all,
              [key]: {
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
    async (already?: HouseholdLoad | null) => {
      // `already` is a request that was started earlier, so the two loads can
      // run at the same time and still be applied in order.
      const loaded = already === undefined ? await fetchHousehold() : already;
      // Could not be asked. The household stays unknown rather than becoming
      // "alone", so no shared answer goes to the wrong rows (R6-1).
      if (!loaded) return false;
      rememberHousehold(loaded.household);
      setHousehold(loaded.household);
      setHouseholdKnown(true);
      if (loaded.household.role === "alone") return true;
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
      return true;
    },
    [],
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
    const house = fetchHousehold();
    apply(await loadEverything());
    await applyHousehold(await house);
  }, [apply, applyHousehold]);

  /*
   * Both at once, rather than one after the other: the household decides where
   * an answer is stored, so the window where it is unknown has to be as small
   * as it can be (R6-1). A shared answer typed inside that window waits in the
   * saver instead of going to the wrong rows.
   */
  useEffect(() => {
    let gone = false;
    // Both requests leave now, so the window where the household is unknown is
    // as short as the slower of the two. They are applied in order below.
    const house = fetchHousehold();
    const people = loadEverything();
    people
      .then((loaded) => {
        if (gone) return null;
        apply(loaded);
        return house;
      })
      .then((waited) => {
        if (!gone && waited !== null) return applyHousehold(waited);
        return false;
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, [apply, applyHousehold]);

  /* A household that could not be asked for is asked for again. Until it
     answers, shared answers stay in the queue and the page says so. */
  useEffect(() => {
    if (householdKnown) return;
    const timer = setInterval(() => {
      applyHousehold();
    }, 5000);
    return () => clearInterval(timer);
  }, [householdKnown, applyHousehold]);

  const setStatus = useCallback(
    async (exerciseId: string, status: ExerciseStatus) => {
      if (!user) return false;
      const before = statuses[exerciseId] ?? "not_started";
      setStatuses((s) => ({ ...s, [exerciseId]: status }));
      try {
        // A shared page is finished for both of them or for neither, so its
        // progress is stored once, with the shared answers on it.
        if (householdKnown && household.role !== "alone" && sharedStatus(exerciseId)) {
          await saveSharedStatus(exerciseId, status);
        } else {
          await store.setStatus(user.id, exerciseId, status);
        }
        if (status === "done" && isSupabaseConfigured && aiConsentIsOn()) {
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
    [user, statuses, saver, household.role, householdKnown],
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
      // Where this answer belongs is decided when it is sent, not here: at
      // startup the household is not known yet (R6-1).
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

  /**
   * Two people wrote the same box. Keep mine, or take theirs.
   *
   * "Mine" is saved over the top on purpose this time, which is what the person
   * just chose. "Theirs" puts their answer on the page, where it can still be
   * edited afterwards like any other.
   */
  /**
   * Two people wrote the same box. Keep mine, or take theirs.
   *
   * The choice is written down, and the other answer is kept beside it until
   * the page is left, so "keep mine" can still be undone (review round 6
   * raised this: a choice made in a hurry was final).
   */
  const settle = useCallback(
    async (key: string, keep: "mine" | "theirs") => {
      const clash = conflicts[key];
      if (!clash) return;
      const value = keep === "mine" ? clash.mine : clash.theirs;
      await saveSharedAnswer({
        exerciseId: clash.exerciseId,
        fieldId: clash.fieldId,
        value,
        loadedAt: seenAt(key),
        force: true,
      }).catch(() => undefined);
      markSeen(key);
      if (keep === "theirs") {
        setAnswers((all) => ({
          ...all,
          [clash.exerciseId]: { ...all[clash.exerciseId], [clash.fieldId]: clash.theirs },
        }));
      }
      setConflicts((all) => ({ ...all, [key]: { ...all[key], settled: keep } }));
    },
    [conflicts],
  );

  /** The question is answered and the person is done with it. */
  const dismissConflict = useCallback((key: string) => {
    setConflicts((all) => {
      const rest = { ...all };
      delete rest[key];
      return rest;
    });
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    setAnswers({});
    setStatuses({});
    setEntitlements([]);
    setHousehold(workingAlone());
    setHouseholdKnown(false);
    forgetHousehold();
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
        householdKnown,
        conflicts,
        settle,
        dismissConflict,
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
