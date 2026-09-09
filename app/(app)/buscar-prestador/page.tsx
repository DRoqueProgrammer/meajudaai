import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { CATEGORIAS, nomeCategoria } from "@/lib/categorias";
import { formatBRL } from "@/lib/format";
import { PontosMap, type MapaPonto } from "@/components/maps/pontos-map-dynamic";

/**
 * Rota `/buscar-prestador` (cliente): busca prestadores por categoria,
 * ordenados por proximidade via `buscar_prestadores_proximos` (RPC que nunca
 * expõe coordenada exata, só a distância — ver migration 0026).
 */
export default async function BuscarPrestadorPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "cliente") redirect("/inicio");

  const { categoria } = await searchParams;
  const sb = await createServerClient();
  const { data: resultados } = await sb.rpc("buscar_prestadores_proximos", {
    p_categoria: categoria || undefined,
  });

  // Pino aproximado (nunca a coordenada exata — ver migration 0033); sem
  // profile_local próprio ainda, o cliente não tem "quem busca" pra ordenar
  // por distância e lat_aprox/lng_aprox vêm null pra todo mundo.
  const pontos: MapaPonto[] = (resultados ?? [])
    .filter((r) => r.lat_aprox != null && r.lng_aprox != null)
    .map((r) => ({
      id: r.prestador_id,
      lat: r.lat_aprox!,
      lng: r.lng_aprox!,
      titulo: r.nome,
      subtitulo: `${r.categoria ? nomeCategoria(r.categoria) : "Categoria não informada"}${r.distancia_km != null ? ` · ${r.distancia_km} km` : ""}`,
      href: `/prestador/${r.prestador_id}`,
    }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Buscar prestador</h1>
      <form className="flex gap-2">
        <select name="categoria" defaultValue={categoria ?? ""} className="input flex-1">
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nome}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-brand px-4 text-sm">
          Buscar
        </button>
      </form>

      {pontos.length > 0 ? <PontosMap pontos={pontos} /> : null}

      <div className="flex flex-col gap-2">
        {(resultados ?? []).length === 0 ? (
          <p className="text-sm text-muted">Nenhum prestador encontrado.</p>
        ) : (
          (resultados ?? []).map((r) => (
            <Link key={r.prestador_id} href={`/prestador/${r.prestador_id}`} className="card flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{r.nome}</p>
                <p className="text-xs text-muted">
                  {r.categoria ? nomeCategoria(r.categoria) : "Categoria não informada"}
                  {r.distancia_km != null ? ` · ${r.distancia_km} km` : ""}
                </p>
              </div>
              <p className="text-sm font-semibold text-brand">
                {r.preco_valor != null ? formatBRL(r.preco_valor) : "—"}
                {r.preco_tipo === "hora" ? <span className="text-xs font-normal text-muted"> /h</span> : null}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
