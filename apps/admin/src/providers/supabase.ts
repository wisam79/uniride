import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; sameSite?: "none" | "strict" | "lax" | boolean; secure?: boolean; httpOnly?: boolean }) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // set() was called from a Server Component - cookies can't be mutated
          }
        },
        remove(name: string, options: { path?: string; domain?: string }) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            // remove() was called from a Server Component - cookies can't be mutated
          }
        },
      },
    }
  );
}
