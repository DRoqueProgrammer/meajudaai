import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTAS_EXEMPLO } from "./contas-exemplo";

/**
 * Foto de cada conta de exemplo, por nome — usado só pelo painel "Ver por
 * dentro" da landing (`app/page.tsx`). Precisa da chave de serviço porque a
 * policy `profiles_select_all` (migration 0001) só libera leitura da tabela
 * `profiles` para `authenticated`, e a landing é pública.
 *
 * Isolado neste módulo (fora de `app/page.tsx` e de `components/landing/`) de
 * propósito: o mural público (`anuncios_publicos`, migrations 0044/0045) lê
 * pelo client anon comum — só este painel antigo de demonstração usa a chave
 * de serviço, e fica claro pra quem procurar `createAdminClient` que a
 * página pública em si nunca precisa dela.
 */
export async function fotosContasExemplo(): Promise<Map<string, string | null>> {
  const nomes = Object.values(CONTAS_EXEMPLO).map((c) => c.nome);
  const { data } = await createAdminClient()
    .from("profiles")
    .select("nome, foto_url")
    .in("nome", nomes);
  return new Map((data ?? []).map((p) => [p.nome, p.foto_url]));
}
