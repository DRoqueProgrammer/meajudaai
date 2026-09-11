import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { listarTiposServico } from "@/lib/tipos-servico";
import { GraficoFaturamento } from "@/components/dashboard/grafico-faturamento";
import type { ServicoFaturado } from "@/lib/faturamento";
import { hojeEmSaoPaulo, somarDias } from "@/lib/datas";

/**
 * Busca os serviços REALIZADOS do prestador da sessão no último ano (a maior
 * janela que os filtros do gráfico oferecem, "Último ano") e monta o gráfico
 * empilhado por tipo (`components/dashboard/grafico-faturamento.tsx`). Mesma
 * regra de faturamento de `app/(app)/inicio/page.tsx`: `preco_valor` dos
 * serviços com status "realizado", na data do `agenda_slots` do serviço —
 * não a de criação do registro.
 *
 * Busca os 365 dias de uma vez e deixa o filtro de período/agrupamento
 * recalcular no cliente (`agruparFaturamento` é puro e roda no browser sem
 * round-trip); é bem menos que 1 ano de agenda de um único prestador, então
 * mandar tudo de uma vez é mais simples que refazer a query a cada clique.
 */
export async function FaturamentoPrestador() {
  const user = await getCurrentUser();
  const sb = await createServerClient();
  // Fuso de São Paulo (lib/datas.ts): o servidor roda em UTC.
  const hoje = hojeEmSaoPaulo();
  const inicioStr = somarDias(hoje, -365);

  const { data: slotsJanela } = await sb
    .from("agenda_slots")
    .select("id, data")
    .eq("prestador_id", user!.id)
    .gte("data", inicioStr)
    .lte("data", hoje);
  const dataPorSlot = new Map((slotsJanela ?? []).map((s) => [s.id, s.data]));
  const idsJanela = (slotsJanela ?? []).map((s) => s.id);

  const { data: realizados } = idsJanela.length
    ? await sb
        .from("servicos")
        .select("slot_id, preco_valor, cliente_id, tipo")
        .in("slot_id", idsJanela)
        .eq("status", "realizado")
    : { data: [] };

  const servicos: ServicoFaturado[] = (realizados ?? [])
    .map((s) => {
      const data = dataPorSlot.get(s.slot_id);
      if (!data) return null;
      return { data, valor: s.preco_valor, tipo: s.tipo, clienteId: s.cliente_id };
    })
    .filter((s): s is ServicoFaturado => s !== null);

  const tipos = await listarTiposServico(sb);

  return <GraficoFaturamento servicos={servicos} tipos={tipos} hoje={hoje} />;
}
