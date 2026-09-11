import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { pracaAtivaDoAdmin } from "@/lib/admin/praca-ativa";
import { PracaAbas, SemPraca } from "@/components/admin/praca-abas";
import {
  listarPrestadoresDaPraca,
  listarAnunciosDosPrestadores,
  listarLimitesDosPrestadores,
  listarSuspeitasDosPrestadores,
  listarSuspensoesAtivas,
  listarSinalizacoesDosAlvos,
} from "@/lib/admin/consultas";
import { contarRealizadosPorPrestador } from "@/lib/admin/abas";
import { comissoesDaPraca, aliquotasDaPraca, saldosPorPrestador, type AliquotaDaPraca } from "@/lib/admin/financeiro";
import { estaAtrasado, diasDesde } from "@/lib/comissao/regras";
import { limiteEfetivo } from "@/lib/anuncios/regras";
import {
  adicionarSuspeitaAction,
  removerSuspeitaAction,
  suspenderPrestadorAction,
  encerrarSuspensaoAction,
} from "@/lib/actions/suspeitas";
import { SuspeitasDoPrestador, type SuspeitaInfo, type SuspensaoInfo } from "@/components/admin/suspeitas-da-praca";
import { FlagsPessoa, type FlagPessoa } from "@/components/flags-pessoa";
import { LimparRedFlags } from "@/components/admin/limpar-red-flags";
import { Avatar } from "@/components/ui";
import { nomeCategoria } from "@/lib/categorias";
import { listarTiposServico } from "@/lib/tipos-servico";
import { formatBRL } from "@/lib/format";

interface PrestadorDaLista {
  userId: string;
  nome: string;
  fotoUrl: string | null;
  categoria: string | null;
  flagsAprovadas: FlagPessoa[];
  suspeitas: SuspeitaInfo[];
  suspensaoAtiva: SuspensaoInfo | null;
  ativos: number;
  limite: number;
  realizados: number;
  aliquotasProprias: AliquotaDaPraca[];
  emAberto: number;
  maisAntigoEmAberto: string | null;
}

/**
 * Rota `/praca/prestadores` (Administrador): os prestadores da praça ativa,
 * com anúncios, serviços realizados, alíquota própria (se houver), saldo de
 * comissão em aberto — com destaque quando atrasado (D-044, 7 dias, só
 * visual) —, red flags e as suspeitas privadas. Pedido do Leonardo em
 * 11/09/2026 (D-047): faltava essa aba, e o botão de limpar red flags de
 * quem já não merece o carimbo. Leitura pela chave de serviço, recortada
 * pela praça (`lib/admin/abas.ts`, `lib/admin/financeiro.ts`).
 */
export default async function PracaPrestadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/inicio");

  const db = createAdminClient();
  const praca = await pracaAtivaDoAdmin(db);
  if (!praca) {
    return (
      <div className="flex flex-col gap-5">
        <PracaAbas atual="/praca/prestadores" pracaNome="" cidade={null} estado={null} />
        <SemPraca />
      </div>
    );
  }

  const { q } = await searchParams;
  const busca = (q ?? "").trim();

  const prestadoresRaw = await listarPrestadoresDaPraca(db, praca.cidade, praca.estado, praca.exemplo);
  const idsPrestadores = prestadoresRaw.map((p) => p.user_id);
  const nomePorPrestador = new Map(prestadoresRaw.map((p) => [p.user_id, p.nome]));

  const sb = await createServerClient();
  const [anunciosRaw, limitesRaw, suspeitasRaw, suspensoesRaw, flagsAprovadasRaw, realizadosPorPrestador, comissoes, aliquotas, tiposServico] =
    await Promise.all([
      listarAnunciosDosPrestadores(db, idsPrestadores),
      listarLimitesDosPrestadores(db, idsPrestadores),
      listarSuspeitasDosPrestadores(db, idsPrestadores),
      listarSuspensoesAtivas(db, idsPrestadores),
      listarSinalizacoesDosAlvos(db, idsPrestadores, ["aprovada"]),
      contarRealizadosPorPrestador(db, idsPrestadores),
      comissoesDaPraca(db, praca.id),
      aliquotasDaPraca(db, praca.id),
      listarTiposServico(sb),
    ]);
  // `aliquotas_comissao.tipo_servico` referencia `tipos_servico.slug`, não a
  // categoria do prestador — usar `nomeCategoria` aqui mostraria o slug bruto
  // (ex.: "pintura") como se fosse rótulo, ou pior, um rótulo de OUTRO catálogo.
  const nomeTipoServico = new Map(tiposServico.map((t) => [t.slug, t.nome]));

  // Nomes de quem registrou suspeita ou sinalizou um prestador — em geral a
  // própria administração ou um cliente, gente que não está necessariamente
  // no mapa de prestadores (mesmo padrão de `app/(app)/inicio/page.tsx`).
  const idsAutoresExtras = [...new Set([...suspeitasRaw.map((s) => s.autor_id), ...flagsAprovadasRaw.map((f) => f.autor_id)])].filter(
    (id): id is string => !!id && !nomePorPrestador.has(id),
  );
  const { data: perfisExtras } = idsAutoresExtras.length
    ? await db.from("profiles").select("user_id, nome").in("user_id", idsAutoresExtras)
    : { data: [] };
  const nomeExtra = new Map((perfisExtras ?? []).map((p) => [p.user_id, p.nome]));
  const nomeAutor = (id: string | null) => (id ? nomePorPrestador.get(id) ?? nomeExtra.get(id) ?? "—" : "—");

  const limitePorPrestador = new Map(limitesRaw.map((l) => [l.prestador_id, l.limite]));
  const ativosPorPrestador = new Map<string, number>();
  for (const a of anunciosRaw) if (a.status === "ativo") ativosPorPrestador.set(a.prestador_id, (ativosPorPrestador.get(a.prestador_id) ?? 0) + 1);

  const suspeitasPorPrestador = new Map<string, SuspeitaInfo[]>();
  for (const s of suspeitasRaw) {
    const arr = suspeitasPorPrestador.get(s.prestador_id) ?? [];
    arr.push({ id: s.id, motivo: s.motivo, descricao: s.descricao, autorNome: nomeAutor(s.autor_id), criadoEm: s.created_at });
    suspeitasPorPrestador.set(s.prestador_id, arr);
  }

  const flagsAprovadasPorPrestador = new Map<string, FlagPessoa[]>();
  for (const f of flagsAprovadasRaw) {
    const arr = flagsAprovadasPorPrestador.get(f.alvo_id) ?? [];
    arr.push({ quando: f.created_at, sinalizado_por: nomeAutor(f.autor_id) });
    flagsAprovadasPorPrestador.set(f.alvo_id, arr);
  }

  const suspensaoPorPrestador = new Map(suspensoesRaw.map((s) => [s.user_id, { motivoPublico: s.motivo_publico, suspensoEm: s.suspenso_em }]));
  const saldos = new Map(saldosPorPrestador(comissoes).map((s) => [s.prestadorId, s]));
  const aliquotasPorPrestador = new Map<string, AliquotaDaPraca[]>();
  for (const a of aliquotas) {
    if (!a.prestadorId) continue;
    const arr = aliquotasPorPrestador.get(a.prestadorId) ?? [];
    arr.push(a);
    aliquotasPorPrestador.set(a.prestadorId, arr);
  }

  const lista: PrestadorDaLista[] = prestadoresRaw
    .map((p) => {
      const saldo = saldos.get(p.user_id);
      const ajuste = limitePorPrestador.get(p.user_id) ?? null;
      return {
        userId: p.user_id,
        nome: p.nome,
        fotoUrl: p.foto_url,
        categoria: p.categoria,
        flagsAprovadas: flagsAprovadasPorPrestador.get(p.user_id) ?? [],
        suspeitas: suspeitasPorPrestador.get(p.user_id) ?? [],
        suspensaoAtiva: suspensaoPorPrestador.get(p.user_id) ?? null,
        ativos: ativosPorPrestador.get(p.user_id) ?? 0,
        limite: limiteEfetivo(ajuste, praca.limitePadrao),
        realizados: realizadosPorPrestador.get(p.user_id) ?? 0,
        aliquotasProprias: aliquotasPorPrestador.get(p.user_id) ?? [],
        emAberto: saldo?.emAberto ?? 0,
        maisAntigoEmAberto: saldo?.maisAntigoEmAberto ?? null,
      };
    })
    .filter((p) => !busca || p.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="flex flex-col gap-5">
      <PracaAbas atual="/praca/prestadores" pracaNome={praca.nome} cidade={praca.cidade} estado={praca.estado} />

      <div>
        <h1 className="text-xl font-semibold">Prestadores da praça</h1>
        <p className="text-sm text-muted">Prestadores de {praca.cidade ?? "sua cidade"}, com anúncios, comissão e sinalizações.</p>
      </div>

      <form method="get" className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1 sm:max-w-xs">
          <label htmlFor="busca-prestador" className="label">
            Buscar por nome
          </label>
          <input id="busca-prestador" type="search" name="q" defaultValue={busca} placeholder="Nome do prestador" className="input text-sm" />
        </div>
        <button type="submit" className="btn-ghost min-h-11 px-4 py-2 text-sm">
          Buscar
        </button>
      </form>

      {lista.length === 0 ? (
        <p className="card-vazio">
          {busca ? `Nenhum prestador com nome parecido com "${busca}".` : `Nenhum Prestador de Serviço em ${praca.cidade ?? "sua cidade"} ainda.`}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {lista.map((p) => {
            const atrasado = estaAtrasado(p.maisAntigoEmAberto);
            return (
              <div key={p.userId} className="card flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar nome={p.nome} fotoUrl={p.fotoUrl} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/perfil/${p.userId}`} className="truncate text-sm font-semibold hover:underline">
                          {p.nome}
                        </Link>
                        <FlagsPessoa flags={p.flagsAprovadas} />
                      </div>
                      <p className="truncate text-xs text-muted">
                        {p.categoria ? `${nomeCategoria(p.categoria)} · ` : ""}
                        {p.ativos} de {p.limite} anúncios ativos · {p.realizados} {p.realizados === 1 ? "serviço realizado" : "serviços realizados"}
                      </p>
                      {p.aliquotasProprias.length > 0 ? (
                        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted">
                          Alíquota própria:
                          {p.aliquotasProprias.map((a) => (
                            <span key={a.id} className="rounded-full bg-tint-info px-2 py-0.5 font-semibold text-brand">
                              {a.tipo ? nomeTipoServico.get(a.tipo) ?? a.tipo : "todos os tipos"} {a.percentual}%
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                    <p className="text-sm font-semibold text-ink">{formatBRL(p.emAberto)} em aberto</p>
                    {atrasado ? (
                      <span className="rounded-full bg-tint-danger px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide text-danger">
                        {diasDesde(p.maisAntigoEmAberto!)} dias em aberto
                      </span>
                    ) : null}
                    <LimparRedFlags userId={p.userId} nome={p.nome} quantidade={p.flagsAprovadas.length} />
                  </div>
                </div>

                <div className="border-t border-line pt-3">
                  <SuspeitasDoPrestador
                    prestadorId={p.userId}
                    prestadorNome={p.nome}
                    suspeitas={p.suspeitas}
                    flagsAprovadas={p.flagsAprovadas}
                    suspensaoAtiva={p.suspensaoAtiva}
                    adicionarSuspeitaAction={adicionarSuspeitaAction}
                    removerSuspeitaAction={removerSuspeitaAction}
                    suspenderPrestadorAction={suspenderPrestadorAction}
                    encerrarSuspensaoAction={encerrarSuspensaoAction}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
