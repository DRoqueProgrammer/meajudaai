import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEMO_ACCOUNTS, type DemoKey } from "@/lib/auth/demo";

export const dynamic = "force-dynamic";

/**
 * Entrada nas contas de demonstração. Grava os cookies do Supabase como
 * SESSION-ONLY (sem maxAge/expires) — ao fechar o navegador a sessão cai e o
 * visitante volta para a landing, em vez de "virar dono" da conta demo.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const who = (url.searchParams.get("who") ?? "joao") as DemoKey;
  const conta = DEMO_ACCOUNTS[who] ?? DEMO_ACCOUNTS.joao;

  const cookieStore = await cookies();
  const sb = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) {
            const sessionOnly = { ...(options ?? {}) } as Record<string, unknown>;
            delete sessionOnly.maxAge;
            delete sessionOnly.expires;
            try {
              cookieStore.set(name, value, sessionOnly);
            } catch {
              // contexto de server component — ignorar
            }
          }
        },
      },
    },
  );

  const { error } = await sb.auth.signInWithPassword({
    email: conta.email,
    password: conta.password,
  });

  const destino = new URL(error ? "/login?demo=erro" : "/inicio", url.origin);
  return NextResponse.redirect(destino);
}
