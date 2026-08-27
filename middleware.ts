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
  "/_next",
  "/favicon",
  "/api/health",
  "/api/demo",
  // O cron do lembrete de avaliação se autentica por bearer secret (CRON_SECRET),
  // não por sessão — o middleware não deve tentar redirecioná-lo para /login.
  "/api/cron",
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
