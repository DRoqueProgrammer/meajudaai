import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CONTAS_EXEMPLO, SENHA_CONTA_EXEMPLO, isPapelExemplo } from "@/lib/auth/contas-exemplo";

export const dynamic = "force-dynamic";

/**
 * `GET /api/exemplo/entrar?papel=cliente|prestador_servico|funcionario|admin|sysadmin`:
 * login numa conta de exemplo REAL (ver lib/auth/contas-exemplo.ts) — diferente
 * das antigas contas demo read-only, estas funcionam normalmente (dá pra
 * editar). Cookies session-only: cai ao fechar o navegador, pra visitantes não
 * "assumirem" a conta de exemplo.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const papel = url.searchParams.get("papel") ?? "";
  if (!isPapelExemplo(papel)) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }
  const conta = CONTAS_EXEMPLO[papel];

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
    password: SENHA_CONTA_EXEMPLO,
  });

  const destino = new URL(error ? "/login?exemplo=erro" : "/inicio", url.origin);
  return NextResponse.redirect(destino);
}
