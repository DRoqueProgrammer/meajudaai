"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  agruparFaturamento,
  type AgrupamentoFaturamento,
  type BarraFaturamento,
  type PeriodoFaturamento,
  type ServicoFaturado,
} from "@/lib/faturamento";
import { formatBRL } from "@/lib/format";
import type { TipoServico } from "@/lib/tipos-servico";

/**
 * Gráfico de faturamento do prestador — pedido do Leonardo em 10/09/2026:
 * "esse gráfico continua feio [...] pode ser um stacked chart, com tipos de
 * serviços que deram o faturamento daquele dia [...] e quando faz hover,
 * aparece em ordem alfabética, num card pequeno na janela. Clicou fora, o
 * card desaparece". SVG próprio (sem lib nova), seguindo o método do skill de
 * dataviz: marca fixa por tipo (nunca por posição), 2px de gap entre
 * segmentos, canto arredondado só na ponta de cima da pilha, um eixo Y,
 * grade discreta, legenda sempre visível e texto nunca na cor da série.
 *
 * O agrupamento (`agruparFaturamento`, `lib/faturamento.ts`) é recalculado no
 * cliente a cada troca de filtro — os dados brutos (até 1 ano) já vêm do
 * servidor via `FaturamentoPrestador`, então trocar período/agrupamento é
 * instantâneo, sem round-trip.
 */

const PERIODOS: { valor: PeriodoFaturamento; rotulo: string }[] = [
  { valor: "15d", rotulo: "15 dias" },
  { valor: "30d", rotulo: "30 dias" },
  { valor: "60d", rotulo: "60 dias" },
  { valor: "90d", rotulo: "90 dias" },
  { valor: "ytd", rotulo: "Este ano" },
  { valor: "12m", rotulo: "Último ano" },
];

const AGRUPAMENTOS: { valor: AgrupamentoFaturamento; rotulo: string }[] = [
  { valor: "dia", rotulo: "Dia" },
  { valor: "semana", rotulo: "Semana" },
  { valor: "mes", rotulo: "Mês" },
];

// Cor FIXA por tipo (nunca por posição na pilha) — paleta validada em
// app/globals.css (--tipo-1..5, ver o comentário lá pro relatório do
// validador). "Outros" reusa --muted: é a categoria "resto", de propósito
// sem uma 6ª cor categórica — cinza neutro que também passa a separação de
// daltonismo contra as 5 cores reais (checado com o mesmo script).
const COR_POR_TIPO: Record<string, string> = {
  manutencao_madeira: "var(--tipo-1)",
  instalacao_eletrica: "var(--tipo-2)",
  instalacao_varal: "var(--tipo-3)",
  instalacao_moveis: "var(--tipo-4)",
  desmontagem_remontagem_moveis: "var(--tipo-5)",
  outros: "var(--muted)",
};
function corDoTipo(slug: string): string {
  return COR_POR_TIPO[slug] ?? "var(--muted)";
}

const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS_SEMANA_ABREV = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Dia da semana a partir de uma data ISO, sem `Date` local (mesma técnica do lib/faturamento.ts). */
function diaSemanaAbrev(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(y!, (m ?? 1) - 1, d)).getUTCDay();
  return capitalizar(DIAS_SEMANA_ABREV[dow]!);
}

/** Cabeçalho do card de hover: "Semana de 07/09 a 10/09", "Qui, 10/09", "Setembro de 2026". */
function periodoDaBarra(barra: BarraFaturamento, agrupamento: AgrupamentoFaturamento): string {
  const [anoIni, mesIni, diaIni] = barra.inicio.split("-");
  const [, mesFim, diaFim] = barra.fim.split("-");
  if (agrupamento === "mes") return `${capitalizar(MESES_LONGOS[Number(mesIni) - 1]!)} de ${anoIni}`;
  if (agrupamento === "dia" || barra.inicio === barra.fim) return `${diaSemanaAbrev(barra.inicio)}, ${diaIni}/${mesIni}`;
  return `Semana de ${diaIni}/${mesIni} a ${diaFim}/${mesFim}`;
}

function formatBRLInteiro(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/** Passo "redondo" (1/2/5 × 10^n) pro eixo Y — poucas linhas de grade, valores fáceis de ler. */
function escalaY(valorMax: number): { topo: number; passo: number } {
  if (valorMax <= 0) return { topo: 10, passo: 10 };
  const passoBruto = valorMax / 4;
  const ordem = Math.pow(10, Math.floor(Math.log10(passoBruto)));
  const passo = [1, 2, 5, 10].map((m) => m * ordem).find((c) => c >= passoBruto) ?? 10 * ordem;
  return { topo: Math.ceil(valorMax / passo) * passo, passo };
}

/** Path de um retângulo com canto arredondado só em cima (mark spec: base sempre quadrada). */
function pathTopoArredondado(x: number, y: number, w: number, h: number, r: number): string {
  const raio = Math.max(0, Math.min(r, w / 2, h));
  if (raio === 0) return `M${x},${y} H${x + w} V${y + h} H${x} Z`;
  return `M${x},${y + h} V${y + raio} Q${x},${y} ${x + raio},${y} H${x + w - raio} Q${x + w},${y} ${x + w},${y + raio} V${y + h} Z`;
}

const LARGURA_BARRA = 20;
const LARGURA_COLUNA_MIN = 34;
const GAP_SEGMENTO = 2;
const PLOT_H = 180;
const RAIO_TOPO = 4;
// Largura reservada pro eixo Y, fixo (`position: sticky`) enquanto as barras
// rolam por baixo — sem isso, rolar pra ver uma barra distante escondia a
// escala junto (R$ 0/50/100... saía de tela com as primeiras barras).
const EIXO_W = 40;

interface Segmento {
  slug: string;
  y: number;
  altura: number;
  ehTopo: boolean;
}

/** Segmentos empilhados de uma barra, na ORDEM DE PILHA (catálogo), com o gap de 2px entre eles. */
function construirSegmentos(barra: BarraFaturamento, ordemPilha: string[], topoEscala: number): Segmento[] {
  const presentes = ordemPilha.filter((slug) => (barra.porTipo[slug] ?? 0) > 0);
  let acumulado = 0;
  return presentes.map((slug, i) => {
    const valor = barra.porTipo[slug]!;
    const alturaBruta = topoEscala > 0 ? (valor / topoEscala) * PLOT_H : 0;
    const ehTopo = i === presentes.length - 1;
    const yTopoReal = PLOT_H - acumulado - alturaBruta;
    const altura = ehTopo ? alturaBruta : Math.max(0, alturaBruta - GAP_SEGMENTO);
    const y = ehTopo ? yTopoReal : yTopoReal + GAP_SEGMENTO;
    acumulado += alturaBruta;
    return { slug, y, altura, ehTopo };
  });
}

export function GraficoFaturamento({
  servicos,
  tipos,
  hoje,
}: {
  servicos: ServicoFaturado[];
  tipos: TipoServico[];
  hoje: string;
}) {
  const [periodo, setPeriodo] = useState<PeriodoFaturamento>("15d");
  const [agrupamento, setAgrupamento] = useState<AgrupamentoFaturamento>("semana");
  const [ativoIdx, setAtivoIdx] = useState<number | null>(null);
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(null);
  const [focoIdx, setFocoIdx] = useState(0);
  const [mostrarTabela, setMostrarTabela] = useState(false);
  const [largura, setLargura] = useState(600);

  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const colunaRefs = useRef(new Map<number, SVGRectElement>());

  const dados = useMemo(
    () => agruparFaturamento(servicos, { periodo, agrupamento, hoje }),
    [servicos, periodo, agrupamento, hoje],
  );

  // Só os tipos com faturamento em algum ponto da janela — legenda e ordem de
  // pilha seguem `tipos.ordem` (catálogo), "Outros" sempre por último.
  const ordemPilha = useMemo(() => {
    const presentes = new Set<string>();
    for (const b of dados.barras) for (const slug of Object.keys(b.porTipo)) presentes.add(slug);
    return tipos.filter((t) => presentes.has(t.slug)).map((t) => t.slug);
  }, [dados, tipos]);
  const tiposPresentes = useMemo(() => tipos.filter((t) => ordemPilha.includes(t.slug)), [tipos, ordemPilha]);
  const nomeDoTipo = useMemo(() => new Map(tipos.map((t) => [t.slug, t.nome])), [tipos]);

  const { topo } = escalaY(Math.max(0, ...dados.barras.map((b) => b.total)));
  const numBarras = dados.barras.length;
  const larguraUtil = Math.max(0, largura - EIXO_W);
  const larguraColuna = Math.max(LARGURA_COLUNA_MIN, larguraUtil / Math.max(1, numBarras));
  const larguraSvg = Math.max(larguraUtil, larguraColuna * numBarras);
  const passoRotulo = Math.max(1, Math.ceil(34 / larguraColuna));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setLargura(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fecha ao clicar/tocar fora do gráfico e do card, e com Esc — pedido
  // literal do Leonardo ("clicou fora, o card desaparece").
  useEffect(() => {
    if (ativoIdx == null) return;
    function fecharSeFora(e: PointerEvent | MouseEvent) {
      const alvo = e.target as Node;
      if (cardRef.current?.contains(alvo)) return;
      if (scrollRef.current?.contains(alvo)) return;
      setAtivoIdx(null);
    }
    function fecharComEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setAtivoIdx(null);
    }
    document.addEventListener("pointerdown", fecharSeFora);
    document.addEventListener("mousedown", fecharSeFora);
    document.addEventListener("keydown", fecharComEsc);
    return () => {
      document.removeEventListener("pointerdown", fecharSeFora);
      document.removeEventListener("mousedown", fecharSeFora);
      document.removeEventListener("keydown", fecharComEsc);
    };
  }, [ativoIdx]);

  function abrirCard(idx: number, alvo: Element) {
    const rect = alvo.getBoundingClientRect();
    const CARD_W = 260;
    let left = rect.left + rect.width / 2 - CARD_W / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - CARD_W - 8));
    let top = rect.bottom + 8;
    if (top + 260 > window.innerHeight) top = Math.max(8, rect.top - 260 - 8);
    setCardPos({ left, top });
    setAtivoIdx(idx);
  }

  function focarColuna(idx: number) {
    setFocoIdx(idx);
    colunaRefs.current.get(idx)?.focus();
  }

  const semDados = dados.total === 0;
  const barraAtiva = ativoIdx != null ? dados.barras[ativoIdx] : null;
  const tiposDaBarraAtiva = barraAtiva
    ? Object.entries(barraAtiva.porTipo)
        .filter(([, v]) => v > 0)
        .map(([slug, valor]) => ({ slug, nome: nomeDoTipo.get(slug) ?? slug, valor }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    : [];

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Faturamento</p>
        <p className="text-2xl font-bold text-brand">{formatBRL(dados.total)}</p>
        <p className="text-sm text-muted">
          {dados.numServicos} {dados.numServicos === 1 ? "serviço" : "serviços"} · {dados.numClientes}{" "}
          {dados.numClientes === 1 ? "cliente" : "clientes"}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div role="radiogroup" aria-label="Período" className="flex flex-wrap gap-1.5">
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              type="button"
              role="radio"
              aria-checked={periodo === p.valor}
              onClick={() => setPeriodo(p.valor)}
              className={`chip text-xs ${periodo === p.valor ? "chip-on" : "chip-off"}`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Agrupar por" className="flex flex-wrap gap-1.5">
          {AGRUPAMENTOS.map((a) => (
            <button
              key={a.valor}
              type="button"
              role="radio"
              aria-checked={agrupamento === a.valor}
              onClick={() => setAgrupamento(a.valor)}
              className={`chip text-xs ${agrupamento === a.valor ? "chip-on" : "chip-off"}`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>

      {semDados ? (
        <p className="card-vazio">Nenhum serviço realizado neste período.</p>
      ) : (
        <>
          <div ref={scrollRef} className="overflow-x-auto">
            <div className="flex" style={{ width: larguraSvg + EIXO_W }}>
              {/* Eixo Y fixo (sticky) — fica visível mesmo rolando pra ver
                  barras distantes; só o rótulo numérico, a grade em si (as
                  linhas horizontais) rola junto das barras. */}
              <svg width={EIXO_W} height={PLOT_H + 28} className="sticky left-0 z-10 shrink-0 bg-card" aria-hidden="true">
                {(() => {
                  const { passo } = escalaY(topo);
                  const linhas = [];
                  for (let v = 0; v <= topo; v += passo) linhas.push(v);
                  return linhas.map((v) => {
                    const y = PLOT_H - (topo > 0 ? (v / topo) * PLOT_H : 0);
                    return (
                      <text key={v} x={EIXO_W - 4} y={y - 3} textAnchor="end" className="fill-muted" fontSize={10}>
                        {formatBRLInteiro(v)}
                      </text>
                    );
                  });
                })()}
              </svg>
              <svg
                width={larguraSvg}
                height={PLOT_H + 28}
                role="img"
                aria-label={`Gráfico de faturamento, ${dados.barras.length} ${agrupamento === "dia" ? "dias" : agrupamento === "semana" ? "semanas" : "meses"}`}
              >
                {/* Grade discreta (as linhas rolam com as barras; o rótulo do eixo é o <svg> fixo à esquerda) */}
                {(() => {
                  const { passo } = escalaY(topo);
                  const linhas = [];
                  for (let v = 0; v <= topo; v += passo) linhas.push(v);
                  return linhas.map((v) => {
                    const y = PLOT_H - (topo > 0 ? (v / topo) * PLOT_H : 0);
                    return (
                      <line
                        key={v}
                        x1={0}
                        x2={larguraSvg}
                        y1={y}
                        y2={y}
                        stroke={v === 0 ? "var(--line-strong)" : "var(--line)"}
                        strokeWidth={1}
                      />
                    );
                  });
                })()}

                {dados.barras.map((barra, i) => {
                  const x = i * larguraColuna;
                  const segmentos = construirSegmentos(barra, ordemPilha, topo);
                  const emFoco = focoIdx === i;
                  const ativo = ativoIdx === i;
                  return (
                    <g key={`${barra.inicio}-${barra.fim}`}>
                      {segmentos.map((s) =>
                        s.ehTopo ? (
                          <path
                            key={s.slug}
                            d={pathTopoArredondado(x + (larguraColuna - LARGURA_BARRA) / 2, s.y, LARGURA_BARRA, s.altura, RAIO_TOPO)}
                            fill={corDoTipo(s.slug)}
                          />
                        ) : (
                          <rect
                            key={s.slug}
                            x={x + (larguraColuna - LARGURA_BARRA) / 2}
                            y={s.y}
                            width={LARGURA_BARRA}
                            height={s.altura}
                            fill={corDoTipo(s.slug)}
                          />
                        ),
                      )}
                      {i % passoRotulo === 0 ? (
                        <text x={x + larguraColuna / 2} y={PLOT_H + 16} textAnchor="middle" className="fill-muted" fontSize={10}>
                          {barra.rotulo}
                        </text>
                      ) : null}
                      {/* Hit area = coluna inteira (maior que a barra), focável e navegável por seta. */}
                      <rect
                        ref={(el) => {
                          if (el) colunaRefs.current.set(i, el);
                          else colunaRefs.current.delete(i);
                        }}
                        x={x}
                        y={0}
                        width={larguraColuna}
                        height={PLOT_H}
                        fill={ativo || emFoco ? "rgba(11,11,11,0.04)" : "transparent"}
                        tabIndex={focoIdx === i ? 0 : -1}
                        role="button"
                        aria-label={`${periodoDaBarra(barra, agrupamento)}: ${formatBRL(barra.total)}`}
                        style={{ outline: "none", cursor: "pointer" }}
                        className={emFoco ? "focus-visible:ring-2 focus-visible:ring-brand" : ""}
                        onMouseEnter={(e) => abrirCard(i, e.currentTarget)}
                        onClick={(e) => abrirCard(i, e.currentTarget)}
                        onFocus={(e) => {
                          setFocoIdx(i);
                          abrirCard(i, e.currentTarget);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                            e.preventDefault();
                            focarColuna(Math.min(numBarras - 1, i + 1));
                          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                            e.preventDefault();
                            focarColuna(Math.max(0, i - 1));
                          }
                        }}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Legenda — sempre visível, só os tipos presentes na janela. Identidade
              pelo quadradinho de cor; o texto nunca herda a cor da série. */}
          <div className="flex flex-wrap gap-3">
            {tiposPresentes.map((t) => (
              <span key={t.slug} className="flex items-center gap-1.5 text-xs text-muted">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: corDoTipo(t.slug) }} />
                {t.nome}
              </span>
            ))}
          </div>

          {barraAtiva ? (
            <div
              ref={cardRef}
              role="dialog"
              aria-label={`Detalhe de ${periodoDaBarra(barraAtiva, agrupamento)}`}
              className="fixed z-50 flex w-[260px] flex-col gap-2 rounded-xl border border-line bg-card p-3 shadow-[0_8px_24px_rgba(15,23,42,0.2)]"
              style={{ left: cardPos?.left ?? 0, top: cardPos?.top ?? 0 }}
            >
              <p className="text-sm font-semibold text-ink">{periodoDaBarra(barraAtiva, agrupamento)}</p>
              <p className="text-lg font-bold text-brand">{formatBRL(barraAtiva.total)}</p>

              {tiposDaBarraAtiva.length > 0 ? (
                <div className="flex flex-col gap-1 border-t border-line pt-2">
                  {tiposDaBarraAtiva.map((t) => (
                    <div key={t.slug} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 text-muted">
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: corDoTipo(t.slug) }} />
                        {t.nome}
                      </span>
                      <span className="font-semibold text-ink">{formatBRL(t.valor)}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {barraAtiva.porDia.length > 0 ? (
                <div className="flex flex-col gap-1 border-t border-line pt-2">
                  <p className="text-rotulo font-semibold uppercase tracking-wide text-muted">Por dia</p>
                  {barraAtiva.porDia.map((d) => (
                    <div key={d.data} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted">{diaSemanaAbrev(d.data)}, {d.data.slice(8, 10)}/{d.data.slice(5, 7)}</span>
                      <span className="font-semibold text-ink">{formatBRL(d.total)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setMostrarTabela((v) => !v)}
            className="link-touch self-start text-xs"
            aria-expanded={mostrarTabela}
          >
            {mostrarTabela ? "Ocultar tabela" : "Ver tabela"}
          </button>

          {mostrarTabela ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Faturamento por {agrupamento} e tipo de serviço</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="py-1 pr-2 font-semibold">Período</th>
                    {tiposPresentes.map((t) => (
                      <th key={t.slug} scope="col" className="py-1 pr-2 font-semibold">{t.nome}</th>
                    ))}
                    <th scope="col" className="py-1 pr-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.barras.map((b) => (
                    <tr key={`${b.inicio}-${b.fim}`} className="border-b border-line">
                      <th scope="row" className="py-1 pr-2 font-normal text-ink">{periodoDaBarra(b, agrupamento)}</th>
                      {tiposPresentes.map((t) => (
                        <td key={t.slug} className="py-1 pr-2 text-ink">{formatBRL(b.porTipo[t.slug] ?? 0)}</td>
                      ))}
                      <td className="py-1 pr-2 font-semibold text-ink">{formatBRL(b.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
