"use client";
/*
 * The place a video sits on a page (spec §6.4).
 *
 * The slot keeps the space and reports where it is; the player itself lives in
 * the layout and is moved over it (see player.tsx). When the slot scrolls away
 * or the person moves to another page, the slot stops reporting and the player
 * becomes the small one in the corner, still playing.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useVideo, type Video } from "@/components/player";
import { shouldOfferResume, timeLabel } from "@/lib/video";

export type VideoContent = {
  title: string;
  length: string | null;
  /** The Bunny video id. The address is signed by the server, per viewer. */
  url: string | null;
  /** A second id, when the sound-only version is its own upload (§6.4). */
  audio_url?: string | null;
  poster?: string;
  captions?: Video["captions"];
};

/** Which door the server should check before it signs anything. */
export type VideoAccess = { step: number } | { module: string };

export function VideoSlot({
  video,
  id,
  access,
  plain = false,
}: {
  video?: VideoContent;
  id?: string;
  /** The step or module this video belongs to, which decides who may watch. */
  access?: VideoAccess;
  /** On a lesson page the video stands alone: no line about the writing below. */
  plain?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const ctx = useVideo();
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /* Set once the server says this video has a sound-only file beside it. */
  const [listen, setListen] = useState(false);
  const videoId = id ?? video?.title ?? "";
  const playingThis = ctx?.now?.id === videoId;

  const report = useCallback(() => {
    const el = box.current;
    if (!el || !ctx) return;
    /*
     * The video stays where it is put. Scrolling never moves it to the corner:
     * that only happens when the person asks for it, with the button on the
     * player. Scrolling past a video and having it leap into the corner is
     * startling, and it is not what anyone asked for.
     */
    const r = el.getBoundingClientRect();
    ctx.claim(videoId, { top: r.top, left: r.left, width: r.width });
  }, [ctx, videoId]);

  useEffect(() => {
    if (!playingThis) return;
    report();
    window.addEventListener("scroll", report, { passive: true });
    window.addEventListener("resize", report);
    const watch = new ResizeObserver(report);
    if (box.current) watch.observe(box.current);
    return () => {
      window.removeEventListener("scroll", report);
      window.removeEventListener("resize", report);
      watch.disconnect();
      ctx?.claim(videoId, null);
    };
  }, [playingThis, report, ctx, videoId]);

  if (!video) return null;

  if (!video.url) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-white px-5 py-3 text-stone print:hidden">
        <span className="font-semibold text-pine">Video: {video.title}</span>. Planned
        {video.length ? `, about ${video.length}` : ""}.
        {plain ? "" : " The written explanation below says the same thing."}
      </p>
    );
  }

  const progress = ctx?.progressOf(videoId) ?? null;
  const resume = shouldOfferResume(progress);
  /* Sound only: either its own upload, or the audio Bunny keeps beside the
     video. The second is only known once the server has answered. */
  const canListen = Boolean(video.audio_url) || listen;

  /**
   * Ask the server for an address and hand it to the player.
   *
   * The files answer only to a signed address and the key that signs one never
   * leaves the server, so this is the only way a video can start. The answer
   * carries the picture, the caption track and the audio as well, because one
   * token covers the whole folder.
   */
  async function start(asAudio: boolean) {
    if (!video?.url || !ctx) return;
    setBusy(true);
    setProblem(null);
    try {
      const where = access && "module" in access ? `module=${encodeURIComponent(access.module)}` : `step=${access && "step" in access ? access.step : ""}`;
      const sound = video.audio_url ? `&audio=${encodeURIComponent(video.audio_url)}` : "";
      const res = await fetch(`/api/video/url?video=${encodeURIComponent(video.url)}&${where}${sound}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setProblem(data.error ?? "That video could not be started.");
        return;
      }
      setListen(Boolean(data.audio));
      ctx.play(
        {
          id: videoId,
          title: video.title,
          src: data.url,
          audioSrc: data.audio ?? undefined,
          poster: data.poster ?? video.poster,
          captions: data.captions?.length ? data.captions : video.captions,
        },
        asAudio,
      );
    } catch {
      setProblem("That video could not be started. Please check your internet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="print:hidden">
      <div ref={box} className="aspect-video w-full overflow-hidden rounded-2xl border border-line bg-pine">
        {/* The space is kept whether or not the player is sitting here, so the
            page does not jump when the video starts or scrolls out of view. */}
        {!playingThis && (
          <button
            type="button"
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-sand"
            disabled={busy}
            onClick={() => start(false)}
          >
            <span aria-hidden className="text-4xl">
              ▶
            </span>
            <span className="font-semibold">
              {busy ? "One moment…" : resume ? `Continue at ${timeLabel(progress!.seconds)}` : "Play"}
            </span>
            <span className="text-sm opacity-80">
              {video.title}
              {video.length ? ` · ${video.length}` : ""}
            </span>
          </button>
        )}
      </div>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 px-1 text-sm text-stone sm:justify-start">
        <span>
          <span className="font-semibold text-pine">{video.title}</span>
          {video.length ? ` · ${video.length}` : ""}
          {plain ? "" : ". The written explanation says the same thing."}
        </span>
        {canListen && (
          <button type="button" className="text-pine underline" disabled={busy} onClick={() => start(true)}>
            Listen instead
          </button>
        )}
      </p>
      {problem && (
        <p role="alert" className="mt-2 rounded-lg bg-ochre-soft p-3 text-sm">
          {problem}
        </p>
      )}
    </div>
  );
}
