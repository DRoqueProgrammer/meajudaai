const DIA_ABREV = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export interface PeriodoAberto {
  horaInicio: string;
  horaFim: string;
  dataMin: string;
  dataMax: string;
  diasSemana: string;
}

/**
 * Resume os horários que o prestador já abriu (de hoje em diante) num período
 * legível — a agenda mostrava um calendário cheio de bolinhas mas em nenhum
 * lugar dizia, em texto, "isso aqui está aberto de tal a tal hora, nesses
 * dias, até tal data". Agrupa por par hora_inicio/hora_fim (cada lote criado
 * de uma vez em `criarSlotsRecorrentesAction` tem o mesmo par).
 */
export function resumoHorariosAbertos(
  slots: { data: string; hora_inicio: string; hora_fim: string }[],
): PeriodoAberto[] {
  const hojeStr = new Date().toLocaleDateString("sv-SE");
  const grupos = new Map<string, { datas: string[]; dias: Set<number> }>();

  for (const s of slots) {
    if (s.data < hojeStr) continue;
    const chave = `${s.hora_inicio}-${s.hora_fim}`;
    if (!grupos.has(chave)) grupos.set(chave, { datas: [], dias: new Set() });
    const g = grupos.get(chave)!;
    g.datas.push(s.data);
    g.dias.add(new Date(`${s.data}T00:00:00`).getDay());
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
      };
    })
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
}
