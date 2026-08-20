import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Destino do link enviado por e-mail. Troca o `token_hash` por uma sessão
 * (os cookies só podem ser gravados em Route Handler / Server Action, não em
 * Server Component) e segue para a tela de senha nova.
 */
/**
 * `GET /auth/confirmar`: callback dos links de e-mail do Supabase (confirmação e
 * recuperação de senha). Troca o `code`/`token_hash` por uma sessão e redireciona
 * para `next` (ex.: /nova-senha).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type");
  const proximo = searchParams.get("next") ?? "/inicio";

  const falhou = NextResponse.redirect(`${origin}/recuperar-senha?expirado=1`);

  const sb = await createServerClient();
  // Dois formatos de link chegam aqui: `code` (template PADRÃO do Supabase,
  // fluxo PKCE) e `token_hash` (só quando o template é customizado com
  // {{ .TokenHash }}, o que exige SMTP próprio). O e-mail nativo do plano free
  // não deixa editar template, então na prática o que chega é `code`.
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return falhou;
  } else if (tokenHash && tipo === "recovery") {
    const { error } = await sb.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (error) return falhou;
  } else {
    return falhou;
  }

  // Só caminhos internos: `next` vem da URL e não pode virar redirect aberto.
  const destino = proximo.startsWith("/") ? proximo : "/inicio";
  return NextResponse.redirect(`${origin}${destino}`);
}
