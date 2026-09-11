import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { pracaAtivaDoAdmin } from "@/lib/admin/praca-ativa";
import { PracaAbas, SemPraca } from "@/components/admin/praca-abas";
import { listarPrestadoresDaPraca } from "@/lib/admin/consultas";
import { listarServicosDaPraca, slotsPorIds, numerosDoMesDaPraca } from "@/lib/admin/abas";
import { comissoesDaPraca, doMes } from "@/lib/admin/financeiro";
import { resumoDoRecibo } from "@/lib/comissao/regras";
import { StatusTabs } from "@/components/status-tabs";
import { Avatar } from "@/components/ui";
import { formatBRL, formatData } from "@/lib/format";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { quandoDoServico } from "@/lib/periodo-da-visita";
import { listarTiposServico } from "@/lib/tipos-servico";

const TABS = [
  { value: "", label: "Todos" },
  { value: "pendente", label: "Pendentes" },
  { value: "confirmado", label: "Confirmados" },
  { value: "realizado", label: "Realizados" },
  { value: "cancelado", label: "Cancelados" },
];

const STATUS_ESTILO: Record<string, string> = {
  pendente: "bg-tint-warn text-tint-warn-ink",
  confirmado: "bg-tint-ok text-ok",
  realizado: "bg-tint-neutral text-ink",
  cancelado: "bg-tint-danger text-danger",
};

const COMISSAO_LABEL: Record<string, string> = {
  em_aberto: "comissão em aberto",
  informada: "comissão informada",
  paga: "comissão paga",
};

const COMISSAO_ESTILO: Record<string, string> = {
  em_aberto: "bg-tint-warn text-tint-warn-ink",
  informada: "bg-tint-info text-brand",
  paga: "bg-tint-ok text-ok",
};

/** Um número do resumo do mês, no mesmo cartão das demais telas administrativas. */
function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="card flex flex-col items-center gap-0.5 py-3 text-center">
      <p className="text-xl font-bold tabular-nums text-brand">{valor}</p>
      <p className="text-xs text-muted">{rotulo}</p>
    </div>
  );
}

/**
 * Rota `/praca/servicos` (Administrador): os serviços dos prestadores da
 * praça ativa, mais recentes primeiro, com filtro por status (`?status=`,
 * chips) e por prestador (`?prestador=<id>`, formulário GET — funciona sem
 * JavaScript). Pedido do Leonardo em 11/09/2026: "a página do administrador
 * não tem tab de Serviços... deveria ter" (D-047). Leitura pela chave de
 * serviço, sempre recortada pela praça (`lib/admin/abas.ts`).
 */
export default async function PracaServicosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; prestador?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/inicio");

  const db = createAdminClient();
  const praca = await pracaAtivaDoAdmin(db);
  if (!praca) {
    return (
      <div className="flex flex-col gap-5">
        <PracaAbas atual="/praca/servicos" pracaNome="" cidade={null} estado={null} />
        <SemPraca />
      </div>
    );
  }

  const { status, prestador } = await searchParams;
  const filtro = TABS.some((t) => t.value === status) ? (status ?? "") : "";

  const prestadores = await listarPrestadoresDaPraca(db, praca.cidade, praca.estado, praca.exemplo);
  const idsPrestadores = prestadores.map((p) => p.user_id);
  // Ignora um `?prestador=` que não seja da praça (outra pessoa, id inventado): cai no "todos".
  const prestadorFiltro = prestador && idsPrestadores.includes(prestador) ? prestador : "";

  const sb = await createServerClient();
  const [servicos, numerosMes, comissoes, tipos] = await Promise.all([
    listarServicosDaPraca(db, idsPrestadores, { status: filtro || undefined, prestadorId: prestadorFiltro || undefined }),
    numerosDoMesDaPraca(db, idsPrestadores),
    comissoesDaPraca(db, praca.id),
    listarTiposServico(sb),
  ]);

  const nomeTipo = new Map(tipos.map((t) => [t.slug, t.nome]));
  const nomePrestador = new Map(prestadores.map((p) => [p.user_id, { nome: p.nome, fotoUrl: p.foto_url }]));
  const comissaoPorServico = new Map(comissoes.map((c) => [c.servicoId, c]));
  // Soma em centavos (resumoDoRecibo), nunca em ponto flutuante direto.
  const comissaoDoMes = resumoDoRecibo(doMes(comissoes, hojeEmSaoPaulo().slice(0, 7))).totalComissao;

  const slotIds = [...new Set(servicos.map((s) => s.slot_id))];
  const clienteIds = [...new Set(servicos.map((s) => s.cliente_id))];
  const [slots, clientesRaw] = await Promise.all([
    slotsPorIds(db, slotIds),
    clienteIds.length ? db.from("profiles").select("user_id, nome").in("user_id", clienteIds) : Promise.resolve({ data: [] as { user_id: string; nome: string }[] }),
  ]);
  const slotDe = new Map(slots.map((s) => [s.id, s]));
  const nomeCliente = new Map((clientesRaw.data ?? []).map((c) => [c.user_id, c.nome]));

  return (
    <div className="flex flex-col gap-5">
      <PracaAbas atual="/praca/servicos" pracaNome={praca.nome} cidade={praca.cidade} estado={praca.estado} />

      <div>
        <h1 className="text-xl font-semibold">Serviços da praça</h1>
        <p className="text-sm text-muted">Os serviços dos prestadores desta praça, mais recentes primeiro.</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Numero valor={String(numerosMes.realizados)} rotulo="realizados no mês" />
        <Numero valor={formatBRL(numerosMes.faturamento)} rotulo="faturado no mês (realizados)" />
        <Numero valor={formatBRL(comissaoDoMes)} rotulo="comissão lançada no mês" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <StatusTabs base="/praca/servicos" current={filtro} tabs={TABS} />
        {/* Formulário GET puro (sem onChange/JS): recarrega a página com o
            prestador escolhido, preservando o status atual num campo oculto. */}
        <form method="get" className="flex items-end gap-2">
          {filtro ? <input type="hidden" name="status" value={filtro} /> : null}
          <div className="flex flex-col gap-1">
            <label htmlFor="prestador-filtro" className="label">
              Prestador
            </label>
            <select id="prestador-filtro" name="prestador" defaultValue={prestadorFiltro} className="input text-sm">
              <option value="">Todos os prestadores</option>
              {prestadores.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-ghost min-h-11 px-4 py-2 text-sm">
            Filtrar
          </button>
        </form>
      </div>

      {servicos.length === 0 ? (
        <p className="card-vazio">
          Nenhum serviço {filtro || prestadorFiltro ? "encontrado neste filtro." : "registrado nesta praça ainda."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {servicos.map((s) => {
            const slot = slotDe.get(s.slot_id);
            const prestadorInfo = nomePrestador.get(s.prestador_id);
            const comissao = comissaoPorServico.get(s.id);
            return (
              <div key={s.id} className="card flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      {slot ? `${formatData(slot.data)} · ${quandoDoServico(slot, s)}` : formatData(s.created_at.slice(0, 10))}
                      {" · "}
                      {nomeTipo.get(s.tipo) ?? "Outros"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Link href={`/perfil/${s.prestador_id}`} className="flex items-center gap-1.5 text-sm font-semibold hover:underline">
                        <Avatar nome={prestadorInfo?.nome ?? "Prestador"} fotoUrl={prestadorInfo?.fotoUrl ?? null} />
                        {prestadorInfo?.nome ?? "Prestador"}
                      </Link>
                      <span aria-hidden="true" className="text-muted">
                        →
                      </span>
                      <Link href={`/perfil/${s.cliente_id}`} className="text-sm font-medium hover:underline">
                        {nomeCliente.get(s.cliente_id) ?? "Cliente"}
                      </Link>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-brand">{formatBRL(s.preco_valor)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${STATUS_ESTILO[s.status] ?? "bg-surface text-muted"}`}>
                      {s.status}
                    </span>
                  </div>
                </div>
                {comissao ? (
                  <p className="text-xs text-muted">
                    Comissão <span className="font-semibold text-ink">{formatBRL(comissao.valor)}</span>{" "}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${COMISSAO_ESTILO[comissao.status] ?? "bg-surface text-muted"}`}>
                      {COMISSAO_LABEL[comissao.status] ?? comissao.status}
                    </span>
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
