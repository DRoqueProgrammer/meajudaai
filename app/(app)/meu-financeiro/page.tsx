import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { listarTiposServico } from "@/lib/tipos-servico";
import {
  montarMatriz,
  filtrarMatriz,
  lerAno,
  lerSituacao,
  anosDisponiveis,
  itemAtrasado,
  totais,
  type ItemDaPessoa,
} from "@/lib/financeiro/matriz";
import { MatrizFinanceira } from "@/components/financeiro/matriz-financeira";
import { FiltrosFinanceiro } from "@/components/financeiro/filtros-financeiro";
import { alternarRecebidoAction } from "@/lib/actions/recebimentos";
import { NovoRecebimentoAvulsoDialog } from "@/components/financeiro/novo-recebimento-avulso-dialog";
import { RecebimentosAvulsosLista } from "@/components/financeiro/recebimentos-avulsos-lista";

/** Uma linha "crua" da grade: um serviço realizado, recebido ou a receber, com a pessoa e o tipo já resolvidos. */
interface LinhaCrua extends ItemDaPessoa {
  tipoSlug: string;
}

/**
 * Rota `/meu-financeiro` — a aba Financeiro do PRESTADOR (D-048, pedido do
 * Leonardo em 11/09/2026): todo serviço realizado entra "a receber" na grade
 * cliente × mês até ele marcar "Recebido" (`alternarRecebidoAction`) — o que
 * cria a linha em `recebimentos` que sustenta o recibo opcional, sem valor
 * fiscal, que ele manda pelo WhatsApp (o cliente NUNCA vê essa aba nem o
 * recibo no app). Cobre também recebimentos avulsos (sem serviço da agenda)
 * e um atalho para a comissão da plataforma, que saiu do menu principal.
 * Tudo lido PELA SESSÃO — a RLS de `recebimentos`/`servicos`/`comissoes` só
 * devolve o que é do prestador logado.
 */
export default async function MeuFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; situacao?: string; pessoa?: string; tipo?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "prestador_servico") redirect("/inicio");

  const { ano: anoParam, situacao: situacaoParam, pessoa: pessoaParam, tipo: tipoParam, q } = await searchParams;

  const sb = await createServerClient();
  const hoje = hojeEmSaoPaulo();
  const anoCorrente = Number(hoje.slice(0, 4));

  const [{ data: servicosRaw }, { data: recebimentosRaw }, { data: comissoesAbertas }] = await Promise.all([
    sb
      .from("servicos")
      .select("id, cliente_id, descricao, preco_valor, tipo, slot_id")
      .eq("prestador_id", user.id)
      .eq("status", "realizado"),
    sb
      .from("recebimentos")
      .select("id, numero, servico_id, cliente_id, pagador_nome, descricao, valor, forma, recebido_em")
      .eq("prestador_id", user.id)
      .order("recebido_em", { ascending: false }),
    sb.from("comissoes").select("valor").eq("prestador_id", user.id).eq("status", "em_aberto"),
  ]);

  const servicos = servicosRaw ?? [];
  const recebimentos = recebimentosRaw ?? [];
  const saldoComissao =
    (comissoesAbertas ?? []).reduce((acc, c) => acc + Math.round(Number(c.valor) * 100), 0) / 100;

  // Datas dos horários (agenda_slots) e nomes de clientes e tipos de serviço,
  // buscados de uma vez para os serviços realizados — o mesmo padrão em Maps
  // de `app/(app)/comissao/page.tsx` e `app/(app)/meus-servicos/page.tsx`.
  const slotIds = [...new Set(servicos.map((s) => s.slot_id))];
  const { data: slotsRaw } = slotIds.length
    ? await sb.from("agenda_slots").select("id, data").in("id", slotIds)
    : { data: [] };
  const dataDoSlot = new Map((slotsRaw ?? []).map((s) => [s.id, s.data]));

  const clienteIds = [...new Set(servicos.map((s) => s.cliente_id))];
  const { data: clientesRaw } = clienteIds.length
    ? await sb.from("profiles").select("user_id, nome").in("user_id", clienteIds)
    : { data: [] };
  const nomeDoCliente = new Map((clientesRaw ?? []).map((c) => [c.user_id, c.nome]));

  const tipos = await listarTiposServico(sb);
  const nomeDoTipo = new Map(tipos.map((t) => [t.slug, t.nome]));

  const recebimentoDoServico = new Map(
    recebimentos.filter((r) => r.servico_id).map((r) => [r.servico_id as string, r]),
  );

  // Cada serviço realizado é um item da grade: recebido (ligado a um
  // recebimento) ou a receber. Sem a data do horário (não deveria acontecer)
  // o serviço não entra — não há mês pra ele cair.
  const todasAsLinhas: LinhaCrua[] = servicos
    .map((s) => {
      const rec = recebimentoDoServico.get(s.id);
      return {
        id: s.id,
        pessoaId: s.cliente_id,
        pessoaNome: nomeDoCliente.get(s.cliente_id) ?? "Cliente",
        data: dataDoSlot.get(s.slot_id) ?? "",
        titulo: nomeDoTipo.get(s.tipo) ?? s.tipo,
        detalhe: s.descricao ? s.descricao.slice(0, 60) : null,
        valor: rec ? Number(rec.valor) : Number(s.preco_valor),
        estado: (rec ? "ok" : "pendente") as ItemDaPessoa["estado"],
        reciboHref: rec ? `/recibo/recebimento/${rec.id}` : null,
        tipoSlug: s.tipo,
      };
    })
    .filter((l) => l.data);

  const pessoas = [...new Map(todasAsLinhas.map((l) => [l.pessoaId, l.pessoaNome])).entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const ano = lerAno(anoParam, anoCorrente);
  const situacao = lerSituacao(situacaoParam);
  const anos = anosDisponiveis(todasAsLinhas.map((l) => l.data), anoCorrente);

  // Pessoa/tipo decidem QUAIS itens entram na grade; situação/busca filtram
  // DENTRO da grade já montada — é `filtrarMatriz` quem sabe fazer isso
  // célula a célula, sem quebrar os totais do mês/ano.
  const itensParaGrade = todasAsLinhas.filter(
    (l) => (!pessoaParam || l.pessoaId === pessoaParam) && (!tipoParam || l.tipoSlug === tipoParam),
  );
  const linhas = filtrarMatriz(montarMatriz(itensParaGrade, ano), { busca: q, situacao }, hoje);

  // KPIs do ano: o panorama completo (todos os clientes e tipos), sem os
  // filtros de exploração acima — senão o card mudaria de sentido a cada clique.
  const itensDoAno = todasAsLinhas.filter((l) => l.data.startsWith(`${ano}-`));
  const totaisDoAno = totais(itensDoAno);
  const atrasados = itensDoAno.filter((l) => itemAtrasado(l, hoje));
  const totalAtrasado = totais(atrasados).total;
  const mesCorrente = hoje.slice(0, 7);
  const recebidoNoMes =
    recebimentos
      .filter((r) => r.recebido_em.startsWith(mesCorrente))
      .reduce((acc, r) => acc + Math.round(Number(r.valor) * 100), 0) / 100;

  const avulsosDoAno = recebimentos.filter((r) => !r.servico_id && r.recebido_em.startsWith(`${ano}-`));
  const totalAvulsosNoAno = avulsosDoAno.reduce((acc, r) => acc + Math.round(Number(r.valor) * 100), 0) / 100;

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Financeiro</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Cada serviço realizado entra aqui — marque &quot;Recebido&quot; quando o cliente pagar e gere o recibo, se
          quiser mandar por WhatsApp. O cliente não vê nada disso no app dele.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Recebido no ano" valor={formatBRL(totaisDoAno.recebido)} classe="text-ok" />
        <Kpi
          label="A receber"
          valor={formatBRL(totaisDoAno.aReceber)}
          classe={totaisDoAno.aReceber > 0 ? "text-danger" : "text-ok"}
        />
        <Kpi
          label="Em atraso (7+ dias)"
          valor={formatBRL(totalAtrasado)}
          classe={totalAtrasado > 0 ? "text-danger" : "text-muted"}
          nota={`${atrasados.length} ${atrasados.length === 1 ? "serviço" : "serviços"}`}
        />
        <Kpi label="Recebido no mês" valor={formatBRL(recebidoNoMes)} classe="text-brand" />
        <Kpi
          label="Avulsos no ano"
          valor={formatBRL(totalAvulsosNoAno)}
          classe="text-ink"
          nota={`${avulsosDoAno.length} ${avulsosDoAno.length === 1 ? "lançamento" : "lançamentos"}`}
        />
      </div>

      <FiltrosFinanceiro
        anos={anos}
        pessoas={pessoas}
        rotuloPessoa="cliente"
        tipos={tipos.map((t) => ({ slug: t.slug, nome: t.nome }))}
      />

      <MatrizFinanceira
        linhas={linhas}
        ano={ano}
        hoje={hoje}
        rotuloPessoa="Cliente"
        rotulos={{ ok: "Recebido", pendente: "A receber" }}
        sufixoValor="em serviços"
        alternarItem={alternarRecebidoAction}
        perfilHref="/clientes/{pessoa}"
        vazio={'Nenhum serviço realizado neste filtro — ele aparece aqui quando um serviço vira "realizado".'}
      />

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Comissão da plataforma</p>
          <p className="text-lg font-bold tabular-nums text-brand">{formatBRL(saldoComissao)}</p>
          <p className="text-xs text-muted">em aberto</p>
        </div>
        <Link href="/comissao" className="shrink-0 text-sm font-semibold text-brand underline">
          Ver comissão →
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted">Recebimentos avulsos</h2>
          <NovoRecebimentoAvulsoDialog clientes={pessoas} />
        </div>
        <RecebimentosAvulsosLista
          itens={avulsosDoAno.map((r) => ({
            id: r.id,
            numero: r.numero,
            pagadorNome: r.pagador_nome,
            descricao: r.descricao,
            valor: Number(r.valor),
            recebidoEm: r.recebido_em,
            forma: r.forma,
          }))}
        />
      </div>
    </div>
  );
}

function Kpi({ label, valor, classe, nota }: { label: string; valor: string; classe: string; nota?: string }) {
  return (
    <div className="card">
      <p className="text-rotulo font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${classe}`}>{valor}</p>
      {nota ? <p className="mt-0.5 text-xs text-muted">{nota}</p> : null}
    </div>
  );
}
