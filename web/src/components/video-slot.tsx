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
  url: string | null;
  poster?: string;
  captions?: Video["captions"];
};

export function VideoSlot({ video, id }: { video?: VideoContent; id?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const ctx = useVideo();
  const videoId = id ?? video?.title ?? "";
  const playingThis = ctx?.now?.id === videoId;
  const [onScreen, setOnScreen] = useState(true);

  const report = useCallback(() => {
    const el = box.current;
    if (!el || !ctx) return;
    const r = el.getBoundingClientRect();
    // Off the top or the bottom of the window: let it become the small player.
    const visible = r.bottom > 56 && r.top < window.innerHeight - 24;
    setOnScreen(visible);
    ctx.claim(videoId, visible ? { top: r.top, left: r.left, width: r.width } : null);
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
        <span className="font-semibold text-pine">Video: {video.title}</span> — being recorded
        {video.length ? `, about ${video.length}` : ""}. The written explanation below says the same thing.
      </p>
    );
  }

  const progress = ctx?.progressOf(videoId) ?? null;
  const resume = shouldOfferResume(progress);

  return (
    <div className="print:hidden">
      <div ref={box} className="aspect-video w-full overflow-hidden rounded-2xl border border-line bg-pine">
        {/* The space is kept whether or not the player is sitting here, so the
            page does not jump when the video starts or scrolls out of view. */}
        {(!playingThis || !onScreen) && (
          <button
            type="button"
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-sand"
            onClick={() =>
              ctx?.play({
                id: videoId,
                title: video.title,
                src: video.url!,
                poster: video.poster,
                captions: video.captions,
              })
            }
          >
            <span aria-hidden className="text-4xl">
              ▶
            </span>
            <span className="font-semibold">
              {resume ? `Continue at ${timeLabel(progress!.seconds)}` : "Play"}
            </span>
            <span className="text-sm opacity-80">
              {video.title}
              {video.length ? ` · ${video.length}` : ""}
            </span>
          </button>
        )}
      </div>
      <p className="mt-2 px-1 text-sm text-stone">
        <span className="font-semibold text-pine">{video.title}</span>
        {video.length ? ` · ${video.length}` : ""} — the written explanation says the same thing.
      </p>
    </div>
  );
}
