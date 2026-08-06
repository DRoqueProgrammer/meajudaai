import { RecuperarSenhaForm } from "./form";

/**
 * Server Component só para ler `?expirado`. O formulário usava
 * `useSearchParams()` num componente cliente sem Suspense, o que passa em dev
 * e derruba o `next build` ("missing-suspense-with-csr-bailout").
 * Lendo o parâmetro no servidor, o problema deixa de existir.
 */
export default async function RecuperarSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ expirado?: string }>;
}) {
  const { expirado } = await searchParams;
  return <RecuperarSenhaForm expirado={expirado === "1"} />;
}
