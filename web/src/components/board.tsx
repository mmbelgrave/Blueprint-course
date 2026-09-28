"use client";
// The vision board (Step 1, 1.2 "Go deeper"): a few pictures of ordinary scenes
// from the day the person described, each with one line about the need it
// represents. The pictures stay in the person's own account; the line is what
// their AI partner reads.
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-state";
import {
  deletePicture,
  pictureLinks,
  picturesAvailable,
  uploadPicture,
  type Picture,
} from "@/lib/backend/pictures";
import type { Field } from "@/lib/content";

const asPictures = (value: unknown): Picture[] =>
  Array.isArray(value)
    ? value.filter((p): p is Picture => !!p && typeof p === "object" && typeof (p as Picture).path === "string")
    : [];

export function ImageBoard({
  field,
  pageId,
  value,
  onChange,
}: {
  field: Field;
  pageId: string;
  value: unknown;
  onChange: (value: Picture[]) => void;
}) {
  const { user } = useApp();
  const pictures = asPictures(value);
  const max = field.max ?? 8;
  const [links, setLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const paths = pictures.map((p) => p.path).join("|");
  useEffect(() => {
    if (!picturesAvailable || !paths) return;
    let cancelled = false;
    pictureLinks(paths.split("|"))
      .then((l) => !cancelled && setLinks(l))
      .catch(() => !cancelled && setError("The pictures could not be loaded. Please reload the page."));
    return () => {
      cancelled = true;
    };
  }, [paths]);

  // Pictures that did upload are kept, even when a later one fails.
  const add = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    setBusy(true);
    setError(null);
    const added: Picture[] = [];
    try {
      for (const file of Array.from(files).slice(0, max - pictures.length)) {
        added.push({ path: await uploadPicture(user.id, pageId, file), caption: "" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The picture could not be added.");
    } finally {
      if (added.length) onChange([...pictures, ...added]);
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const remove = async (path: string) => {
    onChange(pictures.filter((p) => p.path !== path));
    try {
      await deletePicture(path);
    } catch {
      // The picture is already out of the answer; a leftover file is cleaned up
      // when the account is deleted.
    }
  };

  const setCaption = (path: string, caption: string) =>
    onChange(pictures.map((p) => (p.path === path ? { ...p, caption } : p)));

  if (!picturesAvailable) {
    return (
      <p className="rounded-xl border border-line bg-white p-4 text-stone">
        Pictures need an account, so they are not available in preview mode. Everything else on this page works.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {pictures.map((picture) => (
          <figure key={picture.path} className="overflow-hidden rounded-xl border-[1.75px] border-line bg-white">
            <div className="relative aspect-[4/3] bg-sage">
              {links[picture.path] ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed links, not a fixed source
                <img
                  src={links[picture.path]}
                  alt={picture.caption || "A picture on my board"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-sm text-stone">One moment…</span>
              )}
              <button
                type="button"
                onClick={() => remove(picture.path)}
                className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 px-2 py-0.5 text-sm font-semibold text-pine print:hidden"
              >
                Remove
              </button>
            </div>
            <figcaption className="p-2">
              <label className="block">
                <span className="sr-only">{field.caption_label ?? "What this picture gives me"}</span>
                <input
                  className="field-input text-sm"
                  placeholder={field.caption_label ?? "What this picture gives me"}
                  value={picture.caption}
                  onChange={(e) => setCaption(picture.path, e.target.value)}
                />
              </label>
            </figcaption>
          </figure>
        ))}

        {pictures.length < max && (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border-[1.75px] border-dashed border-line bg-white font-semibold text-pine print:hidden"
          >
            <span aria-hidden className="text-2xl leading-none">
              +
            </span>
            {busy ? "Adding…" : "Add picture"}
          </button>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => add(e.target.files)}
      />

      <p className="text-sm text-stone">
        {pictures.length} of {max} pictures. Your pictures stay in your account. Your AI partner reads only the line
        you write under each one, never the picture itself.
      </p>
      {error && <p className="text-sm text-ochre">{error}</p>}
    </div>
  );
}
