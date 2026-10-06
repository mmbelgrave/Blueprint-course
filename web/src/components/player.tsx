"use client";
/*
 * The one video player in the app (spec §6.4).
 *
 * It is mounted once, by the layout, and never unmounted — that is the whole
 * design. Moving from the step page into the exercises does not stop the video;
 * it simply has nowhere to sit any more, so it becomes a small player in the
 * corner and keeps playing while the person writes.
 *
 * The player is always fixed to the window and moved over whichever slot is on
 * screen, rather than being re-parented into it. Re-parenting a <video> through
 * a portal interrupts playback in Safari; moving a fixed box with CSS does not.
 *
 * Where someone had got to is kept on the server (see /api/video/progress), so
 * the phone picks up where the laptop stopped, and a release in the middle of
 * watching loses nothing.
 */
import { MediaPlayer, MediaProvider, type MediaPlayerInstance } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SAVE_EVERY_MS, startAt, worthSaving, type Progress } from "@/lib/video";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

export type Video = {
  id: string;
  title: string;
  /** An HLS address from the video service. */
  src: string;
  poster?: string;
  /** English subtitles, and Dutch where they exist. */
  captions?: { src: string; label: string; language: string; default?: boolean }[];
};

type Rect = { top: number; left: number; width: number };

type VideoState = {
  now: Video | null;
  play: (video: Video) => void;
  stop: () => void;
  /** A slot tells the player where to sit, and null when it leaves the screen. */
  claim: (id: string, rect: Rect | null) => void;
  progressOf: (id: string) => Progress | null;
};

const Ctx = createContext<VideoState | null>(null);

export const useVideo = () => useContext(Ctx);

export function PlayerHost({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState<Video | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const player = useRef<MediaPlayerInstance>(null);
  const lastSaved = useRef<number | null>(null);
  const lastSentAt = useRef(0);

  const play = useCallback((video: Video) => {
    lastSaved.current = null;
    setNow(video);
  }, []);
  const stop = useCallback(() => setNow(null), []);
  const claim = useCallback((id: string, next: Rect | null) => {
    setRect((current) => (next === null && current === null ? current : next));
  }, []);
  const progressOf = useCallback((id: string) => progress[id] ?? null, [progress]);

  const save = useCallback(
    (video: Video, seconds: number, duration: number, beacon = false) => {
      const body = JSON.stringify({ videoId: video.id, seconds, duration });
      lastSaved.current = seconds;
      setProgress((p) => ({ ...p, [video.id]: { seconds, duration } }));
      // On the way out there is no time for a round trip; a beacon survives the
      // tab closing, the phone locking and the app going to the background.
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/video/progress", new Blob([body], { type: "application/json" }));
        return;
      }
      void fetch("/api/video/progress", { method: "POST", headers: { "content-type": "application/json" }, body }).catch(
        () => {},
      );
    },
    [],
  );

  // Leaving, hiding or locking: keep the place before the page goes.
  useEffect(() => {
    if (!now) return;
    const keep = () => {
      const p = player.current;
      if (p) save(now, p.currentTime, p.duration, true);
    };
    const onHide = () => document.visibilityState === "hidden" && keep();
    window.addEventListener("pagehide", keep);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", keep);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [now, save]);

  const value = useMemo<VideoState>(() => ({ now, play, stop, claim, progressOf }), [now, play, stop, claim, progressOf]);

  // Over its slot when there is one, otherwise a small player in the corner.
  const mini = rect === null;
  const style: React.CSSProperties = mini
    ? { right: "1rem", bottom: "1rem", width: "min(22rem, 70vw)" }
    : { top: rect.top, left: rect.left, width: rect.width };

  return (
    <Ctx.Provider value={value}>
      {children}
      {now && (
        <div
          className={`fixed z-40 overflow-hidden rounded-2xl bg-black shadow-lg print:hidden ${mini ? "ring-1 ring-line" : ""}`}
          style={style}
        >
          <MediaPlayer
            ref={player}
            className="w-full"
            title={now.title}
            src={now.src}
            poster={now.poster}
            currentTime={startAt(progress[now.id])}
            playsInline
            // The person already pressed Play on the slot; a second press on the
            // player itself would be a strange thing to ask for.
            autoPlay
            load="eager"
            keyTarget="player"
            storage="blueprint:player"
            onTimeUpdate={() => {
              const p = player.current;
              if (!p) return;
              const at = Date.now();
              if (at - lastSentAt.current < SAVE_EVERY_MS) return;
              if (!worthSaving(lastSaved.current, p.currentTime)) return;
              lastSentAt.current = at;
              save(now, p.currentTime, p.duration);
            }}
            onEnded={() => {
              const p = player.current;
              if (p) save(now, p.duration, p.duration);
            }}
          >
            <MediaProvider>
              {now.captions?.map((c) => (
                <track
                  key={c.src}
                  src={c.src}
                  kind="subtitles"
                  label={c.label}
                  srcLang={c.language}
                  default={c.default}
                />
              ))}
            </MediaProvider>
            <DefaultVideoLayout icons={defaultLayoutIcons} />
          </MediaPlayer>
          {mini && (
            <button
              type="button"
              aria-label="Close the video"
              className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-white"
              onClick={stop}
            >
              ×
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
