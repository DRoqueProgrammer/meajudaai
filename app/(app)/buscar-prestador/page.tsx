import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { CATEGORIAS, nomeCategoria } from "@/lib/categorias";
import { formatBRL } from "@/lib/format";
import { Avatar } from "@/components/ui";
import { PontosMap, type MapaPonto } from "@/components/maps/pontos-map-dynamic";

/**
 * Rota `/buscar-prestador` (cliente): busca prestadores por categoria,
 * ordenados por proximidade via `buscar_prestadores_proximos` (RPC que nunca
 * expõe coordenada exata, só a distância — ver migration 0026). No topo, uma
 * faixa com os anúncios de serviço (migration 0044/0045) via
 * `anuncios_publicos` — a mesma leitura pública do perfil e da página
 * inicial — e, em cada card do resultado, o título do anúncio mais recente
 * do prestador, quando ele tem um ativo.
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
  const [{ data: resultados }, { data: meuPerfil }, { data: anunciosServico }] = await Promise.all([
    sb.rpc("buscar_prestadores_proximos", { p_categoria: categoria || undefined }),
    sb.from("profiles").select("cidade").eq("user_id", user.id).maybeSingle(),
    sb.rpc("anuncios_publicos", { p_tipo: "servico", p_limite: 60 }),
  ]);

  // "Perto de você" de verdade quando dá: prioriza a cidade do próprio
  // cliente; sem anúncio nela (ou sem cidade cadastrada), cai para os mais
  // recentes de qualquer lugar — a faixa não fica vazia por isso.
  const daMinhaCidade = meuPerfil?.cidade
    ? (anunciosServico ?? []).filter((a) => a.cidade === meuPerfil.cidade)
    : [];
  const faixaAnuncios = (daMinhaCidade.length > 0 ? daMinhaCidade : (anunciosServico ?? [])).slice(0, 12);

  // Título do anúncio de serviço ativo mais recente de cada prestador, para
  // mostrar no card do resultado — `anunciosServico` já vem ordenado por
  // `created_at desc`, então o primeiro que achar por prestador é o mais novo.
  const anuncioDoPrestador = new Map<string, string>();
  for (const a of anunciosServico ?? []) {
    if (!anuncioDoPrestador.has(a.prestador_id)) anuncioDoPrestador.set(a.prestador_id, a.titulo);
  }

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

      {faixaAnuncios.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted">Anúncios perto de você</h2>
          {/* Carrossel simples: rolagem horizontal nativa, sem lib — cada
              card leva pro perfil/agenda do prestador (mesma rota do resultado). */}
          <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
            {faixaAnuncios.map((a) => (
              <Link
                key={a.id}
                href={`/prestador/${a.prestador_id}`}
                className="card flex w-64 shrink-0 flex-col gap-2 snap-start"
              >
                <div className="flex items-center gap-2">
                  <Avatar nome={a.prestador_nome} fotoUrl={a.prestador_foto} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{a.prestador_nome}</p>
                    <p className="truncate text-xs text-muted">
                      {a.prestador_categoria ? nomeCategoria(a.prestador_categoria) : "Categoria não informada"}
                    </p>
                  </div>
                </div>
                <p className="line-clamp-2 text-sm text-ink">{a.titulo}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {pontos.length > 0 ? <PontosMap pontos={pontos} /> : null}

      <div className="flex flex-col gap-2">
        {(resultados ?? []).length === 0 ? (
          <p className="card-vazio">Nenhum prestador encontrado.</p>
        ) : (
          (resultados ?? []).map((r) => (
            <Link key={r.prestador_id} href={`/prestador/${r.prestador_id}`} className="card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{r.nome}</p>
                <p className="text-xs text-muted">
                  {r.categoria ? nomeCategoria(r.categoria) : "Categoria não informada"}
                  {r.distancia_km != null ? ` · ${r.distancia_km} km` : ""}
                </p>
                {anuncioDoPrestador.has(r.prestador_id) ? (
                  <p className="mt-1 truncate text-xs text-brand">📢 {anuncioDoPrestador.get(r.prestador_id)}</p>
                ) : null}
              </div>
              <p className="shrink-0 text-sm font-semibold text-brand">
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
