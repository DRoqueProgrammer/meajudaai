const DIA_ABREV = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export interface PeriodoAberto {
  horaInicio: string;
  horaFim: string;
  dataMin: string;
  dataMax: string;
  diasSemana: string;
  /** Mesma informação de `diasSemana`, mas como números (0=domingo…6=sábado) — pras bolinhas D S T Q Q S S da grade de "Agendas abertas". */
  diasSemanaAtivos: number[];
  /**
   * Datas futuras dessa faixa que têm serviço pendente ou confirmado — a
   * grade de "Agendas abertas" usa isto pra bloquear o botão de fechar e
   * explicar por quê (pedido do Leonardo em 10/09/2026: "se tiver serviços
   * agendados numa agenda, não pode cancelar").
   */
  datasComServico: string[];
}

/**
 * Resume os horários que o prestador já abriu (de hoje em diante) num período
 * legível — a agenda mostrava um calendário cheio de bolinhas mas em nenhum
 * lugar dizia, em texto, "isso aqui está aberto de tal a tal hora, nesses
 * dias, até tal data". Agrupa por par hora_inicio/hora_fim (cada lote criado
 * de uma vez em `criarSlotsRecorrentesAction` tem o mesmo par).
 *
 * Horário 'fechado' (migration 0046) não conta como aberto — nem para compor
 * o período, nem para as datas dele: é como se não existisse mais na agenda.
 * `status` é opcional só para não quebrar quem já chamava esta função sem o
 * campo (ele não muda o agrupamento, livre/pendente/confirmado formam o mesmo
 * período — só filtra fechado e marca quais datas têm serviço).
 */
export function resumoHorariosAbertos(
  slots: { data: string; hora_inicio: string; hora_fim: string; status?: string }[],
): PeriodoAberto[] {
  const hojeStr = new Date().toLocaleDateString("sv-SE");
  const grupos = new Map<string, { datas: string[]; dias: Set<number>; datasComServico: string[] }>();

  for (const s of slots) {
    if (s.status === "fechado") continue;
    if (s.data < hojeStr) continue;
    const chave = `${s.hora_inicio}-${s.hora_fim}`;
    if (!grupos.has(chave)) grupos.set(chave, { datas: [], dias: new Set(), datasComServico: [] });
    const g = grupos.get(chave)!;
    g.datas.push(s.data);
    g.dias.add(new Date(`${s.data}T00:00:00`).getDay());
    if (s.status === "pendente" || s.status === "confirmado") g.datasComServico.push(s.data);
  }

  return [...grupos.entries()]
    .map(([chave, g]) => {
      const [horaInicio, horaFim] = chave.split("-") as [string, string];
      const datasOrdenadas = [...g.datas].sort();
      const diasOrdenados = [...g.dias].sort((a, b) => a - b);
      return {
        horaInicio,
        horaFim,
        dataMin: datasOrdenadas[0]!,
        dataMax: datasOrdenadas[datasOrdenadas.length - 1]!,
        diasSemana: diasOrdenados.map((d) => DIA_ABREV[d]).join(", "),
        diasSemanaAtivos: diasOrdenados,
        datasComServico: [...g.datasComServico].sort(),
      };
    })
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
}
