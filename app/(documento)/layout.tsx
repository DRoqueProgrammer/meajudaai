import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";

/**
 * Layout do grupo "(documento)": recibos para imprimir/salvar PDF. Sem a
 * navegação do app (é papel, não painel — o componente de menu não entra
 * aqui) e sem qualquer casca visual própria — cada página de recibo desenha
 * a própria folha do zero, com cor explícita, porque o documento tem que
 * ficar claro mesmo com o app no tema escuro.
 *
 * Exige sessão (qualquer papel — cada página de recibo decide quem
 * especificamente pode ver AQUELE recibo): sem isso, o link funcionaria pra
 * quem nem está logado.
 */
export default async function DocumentoLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
