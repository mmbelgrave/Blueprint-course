// Supabase client for server code (route handlers). Reads the signed-in
// person's session from cookies. Uses the public key, so RLS still applies.
import { createServerClient } from "@supabase/ssr";
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
