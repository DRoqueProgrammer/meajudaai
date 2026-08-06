import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Destino do link enviado por e-mail. Troca o `token_hash` por uma sessão
 * (os cookies só podem ser gravados em Route Handler / Server Action, não em
 * Server Component) e segue para a tela de senha nova.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type");
  const proximo = searchParams.get("next") ?? "/inicio";

  const falhou = NextResponse.redirect(`${origin}/recuperar-senha?expirado=1`);
  if (!tokenHash || tipo !== "recovery") return falhou;

  const sb = await createServerClient();
  const { error } = await sb.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  if (error) return falhou;

  // Só caminhos internos: `next` vem da URL e não pode virar redirect aberto.
  const destino = proximo.startsWith("/") ? proximo : "/inicio";
  return NextResponse.redirect(`${origin}${destino}`);
}
