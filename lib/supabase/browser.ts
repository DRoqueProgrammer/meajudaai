import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** Client Supabase do navegador (chave anon), para Realtime e leituras client-side sob RLS. */
export function createBrowserClient() {
  return createSSRBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
