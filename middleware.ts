import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// `/auth` e `/recuperar-senha` são públicos: quem esqueceu a senha, por
// definição, não tem sessão. `/nova-senha` fica fora da lista de propósito — só
// se chega nela com a sessão que o link do e-mail cria.
const PUBLIC_PREFIXES = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/termos",
  "/privacidade",
  "/auth",
  "/convite",
  // Página pública do prestador (Fatia 5, "/p/[id]"): vitrine sem login —
  // quem não tem conta vê o perfil, os anúncios e os horários livres antes
  // de decidir se cadastra. Ver app/p/[id]/page.tsx.
  "/p/",
  "/_next",
  "/favicon",
  "/api/health",
  "/api/demo",
  "/api/exemplo",
  // O cron do lembrete de avaliação se autentica por bearer secret (CRON_SECRET),
  // não por sessão — o middleware não deve tentar redirecioná-lo para /login.
  "/api/cron",
  // `GET /api/meus-dados` (D-023) decide sozinho o 401 sem sessão — como um
  // download teria virado uma página HTML de /login (a Content-Disposition
  // nunca chegaria), em vez do JSON que a rota promete.
  "/api/meus-dados",
];

/**
 * Middleware de sessão + guarda de rotas. Renova os cookies do Supabase a cada
 * request e faz o roteamento de acesso: sem sessão, manda rotas privadas para
 * /login; com sessão, tira o usuário das telas de login/cadastro/recuperação.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  if (!user && !isPublic && path !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Volta para onde a pessoa ia depois de entrar (entrarAction confere com
    // lib/destino-seguro.ts). Rotas de API não voltam para lugar nenhum.
    url.search = "";
    if (!path.startsWith("/api/")) url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  if (user && (path === "/login" || path === "/cadastro" || path === "/recuperar-senha")) {
    const url = request.nextUrl.clone();
    url.pathname = "/inicio";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
