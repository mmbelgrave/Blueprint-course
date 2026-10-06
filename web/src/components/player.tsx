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
 *
 * Built on Video.js 10. Vidstack was the first choice and was deprecated in
 * favour of this the same day, so it was moved before any content existed. One
 * thing had to be added by hand that Vidstack did for itself: the Media Session
 * details, which put the title and the controls on a locked phone screen — the
 * whole point of the sound-only version.
 */
import { HlsJsVideo } from "@videojs/react/media/hlsjs-video";
import { VideoPlayer, VideoSkin } from "@videojs/react/video";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SAVE_EVERY_MS, startAt, worthSaving, type Progress } from "@/lib/video";
import "@videojs/react/video/skin.css";

export type Video = {
  id: string;
  title: string;
  /** An HLS address from the video service. */
  src: string;
  /**
   * The same lesson as sound only, for listening while walking or driving. It
   * shares this video's id, so switching between watching and listening keeps
   * your place, and finishing either one counts as finishing the lesson.
   */
  audioSrc?: string;
  poster?: string;
  /** English subtitles, and Dutch where they exist. */
  captions?: { src: string; label: string; language: string; default?: boolean }[];
};

type Rect = { top: number; left: number; width: number };

type VideoState = {
  now: Video | null;
  listening: boolean;
  listen: (on: boolean) => void;
  play: (video: Video, asAudio?: boolean) => void;
  stop: () => void;
  /** A slot tells the player where to sit, and null when it leaves the screen. */
  claim: (id: string, rect: Rect | null) => void;
  progressOf: (id: string) => Progress | null;
};

const Ctx = createContext<VideoState | null>(null);

export const useVideo = () => useContext(Ctx);

export function PlayerHost({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState<Video | null>(null);
  const [listening, setListening] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const media = useRef<HTMLVideoElement | null>(null);
  const lastSaved = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const keepPlace = useRef(0);

  const play = useCallback((video: Video, asAudio = false) => {
    lastSaved.current = null;
    setListening(asAudio && !!video.audioSrc);
    setNow(video);
  }, []);
  const stop = useCallback(() => setNow(null), []);
  const listen = useCallback((on: boolean) => {
    keepPlace.current = media.current?.currentTime ?? 0;
    setListening(on);
  }, []);
  const claim = useCallback((id: string, next: Rect | null) => {
    setRect((current) => (next === null && current === null ? current : next));
  }, []);
  const progressOf = useCallback((id: string) => progress[id] ?? null, [progress]);

  const save = useCallback((video: Video, seconds: number, duration: number, beacon = false) => {
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
  }, []);

  /*
   * Everything that happens on the media element itself: starting where the
   * person stopped, keeping that place, and telling a locked phone what is
   * playing. Video.js hands us the element, so these are plain media events.
   */
  useEffect(() => {
    const el = media.current;
    if (!el || !now) return;

    const onLoaded = () => {
      // Opening a half-watched lesson, or coming back from a swap between
      // watching and listening.
      const resumeAt = keepPlace.current > 0 ? keepPlace.current : startAt(progress[now.id]);
      if (resumeAt > 0 && Math.abs(el.currentTime - resumeAt) > 1) el.currentTime = resumeAt;
      keepPlace.current = 0;
      void el.play().catch(() => {
        // A browser that will not start without a tap. The controls are there.
      });
      // Vidstack set this for itself; Video.js does not. Without it a locked
      // phone shows nothing useful while the sound-only version plays.
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: now.title,
          artist: "The Made Real Blueprint",
          artwork: now.poster ? [{ src: now.poster }] : undefined,
        });
      }
    };

    const onTime = () => {
      const at = Date.now();
      if (at - lastSentAt.current < SAVE_EVERY_MS) return;
      if (!worthSaving(lastSaved.current, el.currentTime)) return;
      lastSentAt.current = at;
      save(now, el.currentTime, el.duration);
    };

    const onEnded = () => save(now, el.duration, el.duration);
    const keep = () => save(now, el.currentTime, el.duration, true);
    const onHide = () => document.visibilityState === "hidden" && keep();

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    window.addEventListener("pagehide", keep);
    document.addEventListener("visibilitychange", onHide);
    if (el.readyState >= 1) onLoaded();

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
      window.removeEventListener("pagehide", keep);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [now, listening, save, progress]);

  const value = useMemo<VideoState>(
    () => ({ now, listening, listen, play, stop, claim, progressOf }),
    [now, listening, listen, play, stop, claim, progressOf],
  );

  // Over its slot when there is one; otherwise, and whenever someone is only
  // listening, the small player in the corner.
  const mini = rect === null || listening;
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
          <VideoPlayer title={now.title} poster={now.poster}>
            <VideoSkin style={{ aspectRatio: "16 / 9" }}>
              <HlsJsVideo ref={media} source={{ src: listening && now.audioSrc ? now.audioSrc : now.src }} playsInline>
                {now.captions?.map((c) => (
                  <track
                    key={c.src}
                    kind="captions"
                    src={c.src}
                    label={c.label}
                    srcLang={c.language}
                    default={c.default}
                  />
                ))}
              </HlsJsVideo>
            </VideoSkin>
          </VideoPlayer>
          {now.audioSrc && (
            <button
              type="button"
              className="absolute left-1 top-1 z-10 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
              onClick={() => listen(!listening)}
            >
              {listening ? "Watch" : "Listen"}
            </button>
          )}
          {mini && (
            <button
              type="button"
              aria-label="Close the video"
              className="absolute right-1 top-1 z-10 rounded-full bg-black/60 px-2 text-white"
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
