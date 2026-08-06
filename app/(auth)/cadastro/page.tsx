import { CadastroForm, type Papel } from "./form";

/**
 * Server Component só para ler `?papel`, vindo dos dois CTAs da landing.
 * Ler no servidor evita o `useSearchParams()` sem Suspense, que passa em dev
 * e derruba o `next build`.
 */
export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ papel?: string }>;
}) {
  const { papel } = await searchParams;
  const inicial: Papel | null = papel === "admin" || papel === "ajudante" ? papel : null;
  return <CadastroForm papelInicial={inicial} />;
}
