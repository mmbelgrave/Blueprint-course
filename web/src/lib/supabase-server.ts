// Supabase client for server code (route handlers). Reads the signed-in
// person's session from cookies. Uses the public key, so RLS still applies.
import { createServerClient } from "@supabase/ssr";
import type { JWK } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/*
 * Session cookies carry Secure in production (legal review, part 4). Supabase
 * sets Path=/, SameSite=Lax and a 400-day Max-Age, and leaves Secure off,
 * which would let a browser send the session over plain http on its way to the
 * https redirect. HttpOnly stays off because the browser client reads the
 * session itself; that is how @supabase/ssr works.
 */
const SECURE = process.env.NODE_ENV === "production";

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) {
            cookieStore.set(name, value, { ...options, secure: SECURE });
          }
        },
      },
    },
  );
}

/* ---------------------------------------------------------------------------
 * Who is signed in, without asking Supabase every time.
 *
 * `auth.getUser()` sends the token to the auth server on every request and
 * waits for the answer. Measured on the live app, that is a fifth to a third
 * of what an API route costs, before it has asked a single question about the
 * person. The project signs its tokens with an ECC key (rotated in September),
 * so the signature can be checked here instead: `getClaims` verifies it with
 * the public key and never leaves the machine.
 *
 * The keys themselves are public, they change about as often as a certificate,
 * and they are cached for ten minutes — otherwise the SDK would fetch them
 * once per request, which is the journey we are trying to avoid. A token
 * signed the old way (a session older than the rotation) falls back to the
 * auth server by itself, inside getClaims, so nobody is thrown out.
 *
 * What this gives up: a session revoked at the server stays usable until the
 * access token expires, an hour at most. Signing out clears the cookie in the
 * browser either way, and every route still reads the person's own rows under
 * row-level security.
 * ------------------------------------------------------------------------- */

let keys: JWK[] | null = null;
let fetchedAt = 0;
const KEYS_FOR = 10 * 60 * 1000;

async function signingKeys(): Promise<JWK[] | null> {
  if (keys && Date.now() - fetchedAt < KEYS_FOR) return keys;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`, {
      cache: "no-store",
    });
    if (!res.ok) return keys;
    const body = (await res.json()) as { keys?: JWK[] };
    if (!body.keys?.length) return keys;
    keys = body.keys;
    fetchedAt = Date.now();
    return keys;
  } catch {
    // The old road is still open: getClaims asks the auth server itself.
    return keys;
  }
}

/** A Supabase client made by `supabaseServer`, or by the proxy. */
type Server = Awaited<ReturnType<typeof supabaseServer>>;

/**
 * The person this request belongs to, or null.
 *
 * The shape is `{ user }` on purpose: it is what `auth.getUser()` answered,
 * so a route reads `auth.user.id` as it always did.
 */
export async function sessionUser(supabase: Server): Promise<{ user: { id: string; email: string | null } | null }> {
  const known = await signingKeys();
  const { data, error } = await supabase.auth.getClaims(undefined, known ? { keys: known } : {});
  if (error || !data?.claims?.sub) return { user: null };
  const claims = data.claims as { sub: string; email?: string };
  return { user: { id: claims.sub, email: claims.email ?? null } };
}
