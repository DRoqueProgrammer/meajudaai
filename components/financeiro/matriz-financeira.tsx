"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/actions/auth";
import { formatBRL, formatData } from "@/lib/format";
import { mesPorExtenso } from "@/lib/comissao/regras";
import {
  CHAVES_MESES,
  MESES_CURTOS,
  estadoDaCelula,
  itemAtrasado,
  totais,
  totaisDaLinha,
  totaisDoMes,
  type EstadoCelula,
  type ItemMatriz,
  type LinhaMatriz,
} from "@/lib/financeiro/matriz";

/**
 * A grade do Financeiro (D-048, molde da `ManagementGrid` do amazing-school):
 * uma linha por pessoa (cliente, no Financeiro do prestador; prestador, no do
 * Administrador), os 12 meses do ano e o total. A célula tem a cor da
 * situação; passar o mouse (ou tocar, no celular) abre o card do mês com uma
 * linha por serviço e o ✓/✗ clicável — recebido/a receber, ou OK/não recebido
 * da comissão —, o recibo de cada item e, para o Administrador, "Marcar o mês
 * como pago" e o recibo do mês.
 *
 * Tudo que vem do servidor é dado ou Server Action (as únicas funções que
 * atravessam para um Client Component): links por modelo de texto
 * (`{pessoa}`, `{mes}`), ações como props.
 */

export interface MatrizFinanceiraProps {
  linhas: LinhaMatriz[];
  ano: number;
  /** Hoje no fuso de São Paulo (AAAA-MM-DD) — atraso e mês corrente. */
  hoje: string;
  /** Cabeçalho da primeira coluna ("Cliente", "Prestador"). */
  rotuloPessoa: string;
  /** Como chamar os dois estados do ✓/✗ neste Financeiro. */
  rotulos: { ok: string; pendente: string; informado?: string };
  /** O que o valor da célula significa ("em serviços", "de comissão"). */
  sufixoValor: string;
  /** ✓ (true) / ✗ (false) de um item — Server Action. */
  alternarItem: (id: string, ok: boolean) => Promise<ActionResult>;
  /** Só no Administrador: dá o OK em todos os itens do mês da pessoa. */
  marcarMesPago?: (pessoaId: string, mes: string) => Promise<ActionResult>;
  /** Modelo do link do perfil, com `{pessoa}`. */
  perfilHref?: string;
  /** Modelo do recibo do mês, com `{pessoa}` e `{mes}` (AAAA-MM). */
  reciboMesHref?: string;
  /** Texto do estado vazio (nenhuma linha no filtro). */
  vazio: string;
}

const ESTILO_CELULA: Record<EstadoCelula, string> = {
  vazia: "text-muted",
  ok: "bg-tint-ok text-ok",
  pendente: "bg-surface text-ink",
  parcial: "bg-tint-info text-ink",
  informada: "bg-tint-warn text-tint-warn-ink",
  atrasada: "bg-tint-danger text-danger",
};

const NOME_ESTADO: Record<EstadoCelula, string> = {
  vazia: "sem serviços",
  ok: "tudo pago",
  pendente: "a receber",
  parcial: "parte paga",
  informada: "pagamento informado, aguardando OK",
  atrasada: "em atraso",
};

const preencher = (modelo: string, pessoa: string, mes?: string) =>
  modelo.replaceAll("{pessoa}", pessoa).replaceAll("{mes}", mes ?? "");

/** Valor curto para caber na célula: "R$ 1,2 mil" a partir de mil. */
function valorCurto(v: number): string {
  if (v >= 1000) return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return formatBRL(v);
}

interface Aberto {
  pessoa: LinhaMatriz;
  mes: string;
  /** Retângulo da célula, para posicionar o card. */
  ancora: DOMRect;
  /** Aberto por clique/toque (fica) ou por hover (fecha ao sair). */
  fixo: boolean;
}

export function MatrizFinanceira(props: MatrizFinanceiraProps) {
  const { linhas, ano, hoje, rotuloPessoa, sufixoValor, vazio } = props;
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const fecharTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mesCorrente = hoje.startsWith(`${ano}-`) ? hoje.slice(5, 7) : null;

  const cancelarFechar = () => {
    if (fecharTimer.current) clearTimeout(fecharTimer.current);
    fecharTimer.current = null;
  };
  const agendarFechar = useCallback(() => {
    cancelarFechar();
    fecharTimer.current = setTimeout(() => setAberto((a) => (a && !a.fixo ? null : a)), 180);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(null);
    // Rolar a página tira a célula de baixo do card: fecha em vez de flutuar solto.
    const aoRolar = () => setAberto((a) => (a?.fixo ? a : null));
    document.addEventListener("keydown", aoTeclar);
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("scroll", aoRolar);
    };
  }, [aberto]);

  // Mantém o card sincronizado com os dados novos depois de um ✓/✗ (router.refresh).
  const pessoaAtual = aberto ? (linhas.find((l) => l.pessoaId === aberto.pessoa.pessoaId) ?? aberto.pessoa) : null;

  if (linhas.length === 0) return <p className="card-vazio">{vazio}</p>;

  function abrir(el: HTMLElement, pessoa: LinhaMatriz, mes: string, fixo: boolean) {
    cancelarFechar();
    setAberto({ pessoa, mes, ancora: el.getBoundingClientRect(), fixo });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm tabular-nums">
          <caption className="sr-only">
            Grade de {ano}: uma linha por {rotuloPessoa.toLowerCase()}, uma coluna por mês. Abra uma célula para ver os serviços.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 border-b border-line bg-card px-3 py-2 text-left text-rotulo font-semibold uppercase tracking-wide text-muted">
                {rotuloPessoa}
              </th>
              {CHAVES_MESES.map((m, i) => (
                <th
                  key={m}
                  scope="col"
                  className={`border-b border-line px-1 py-2 text-center text-rotulo font-semibold uppercase tracking-wide ${m === mesCorrente ? "text-brand" : "text-muted"}`}
                >
                  {MESES_CURTOS[i]}
                </th>
              ))}
              <th scope="col" className="border-b border-l border-line px-3 py-2 text-right text-rotulo font-semibold uppercase tracking-wide text-muted">
                {ano}
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const totalAno = totaisDaLinha(l);
              return (
                <tr key={l.pessoaId} className="group">
                  <th scope="row" className="sticky left-0 z-10 border-b border-line bg-card px-3 py-2 text-left font-normal">
                    {props.perfilHref ? (
                      <Link href={preencher(props.perfilHref, l.pessoaId)} className="block max-w-[11rem] truncate font-semibold text-ink hover:text-brand hover:underline">
                        {l.nome}
                      </Link>
                    ) : (
                      <span className="block max-w-[11rem] truncate font-semibold">{l.nome}</span>
                    )}
                  </th>
                  {CHAVES_MESES.map((m) => {
                    const itens = l.meses[m];
                    const estado = estadoDaCelula(itens, hoje);
                    const t = totais(itens);
                    if (estado === "vazia") {
                      return (
                        <td key={m} className="border-b border-line px-1 py-1.5 text-center text-muted" aria-label="sem serviços">
                          —
                        </td>
                      );
                    }
                    const ativo = aberto?.pessoa.pessoaId === l.pessoaId && aberto.mes === m;
                    return (
                      <td key={m} className="border-b border-line px-1 py-1.5">
                        <button
                          type="button"
                          onMouseEnter={(e) => abrir(e.currentTarget, l, m, false)}
                          onMouseLeave={agendarFechar}
                          onClick={(e) => abrir(e.currentTarget, l, m, true)}
                          aria-expanded={ativo}
                          aria-label={`${l.nome}, ${mesPorExtenso(`${ano}-${m}`)}: ${formatBRL(t.total)} ${sufixoValor}, ${NOME_ESTADO[estado]}`}
                          className={`flex min-h-11 w-full flex-col items-center justify-center rounded-lg px-1 text-xs font-semibold leading-tight transition-shadow hover:shadow-[0_0_0_2px_var(--line-strong)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${ESTILO_CELULA[estado]} ${ativo ? "shadow-[0_0_0_2px_var(--brand-ink)]" : ""}`}
                        >
                          <span className="flex items-center gap-0.5">
                            {estado === "ok" ? <Marca ok /> : estado === "atrasada" ? <Marca ok={false} /> : null}
                            {valorCurto(t.total)}
                          </span>
                          <span className="text-[10px] font-medium opacity-80">
                            {itens!.length} {itens!.length === 1 ? "serviço" : "serviços"}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-b border-l border-line px-3 py-1.5 text-right">
                    <span className="block font-semibold">{formatBRL(totalAno.total)}</span>
                    {totalAno.aReceber > 0 ? (
                      <span className="block text-[11px] text-danger">{formatBRL(totalAno.aReceber)} a receber</span>
                    ) : (
                      <span className="block text-[11px] text-ok">em dia</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-rotulo font-semibold uppercase tracking-wide text-muted">
                Total do mês
              </th>
              {CHAVES_MESES.map((m) => {
                const t = totaisDoMes(linhas, m);
                return (
                  <td key={m} className="px-1 py-2 text-center text-xs font-semibold text-ink">
                    {t.total > 0 ? valorCurto(t.total) : <span className="text-muted">—</span>}
                  </td>
                );
              })}
              <td className="border-l border-line px-3 py-2 text-right text-sm font-bold text-brand">
                {formatBRL(linhas.reduce((s, l) => s + Math.round(totaisDaLinha(l).total * 100), 0) / 100)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <Legenda />

      {aberto && pessoaAtual ? (
        <CardDoMes
          {...props}
          pessoa={pessoaAtual}
          mes={aberto.mes}
          ancora={aberto.ancora}
          onEntrar={cancelarFechar}
          onSair={() => !aberto.fixo && agendarFechar()}
          onFechar={() => setAberto(null)}
        />
      ) : null}
    </div>
  );
}

/** ✓ verde / ✗ vermelho, desenhados (não emoji). */
function Marca({ ok, grande = false }: { ok: boolean; grande?: boolean }) {
  const cls = grande ? "h-4 w-4" : "h-3 w-3";
  return ok ? (
    <svg viewBox="0 0 24 24" className={`${cls} shrink-0`} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className={`${cls} shrink-0`} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

function Legenda() {
  const itens: [EstadoCelula, string][] = [
    ["ok", "Tudo pago"],
    ["pendente", "A receber"],
    ["parcial", "Parte paga"],
    ["informada", "Pagamento informado"],
    ["atrasada", "Em atraso (7+ dias)"],
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legenda das cores">
      {itens.map(([e, rotulo]) => (
        <li key={e} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-4 rounded ${ESTILO_CELULA[e]} border border-line`} aria-hidden="true" />
          {rotulo}
        </li>
      ))}
    </ul>
  );
}

function CardDoMes({
  pessoa,
  mes,
  ano,
  hoje,
  ancora,
  rotulos,
  sufixoValor,
  alternarItem,
  marcarMesPago,
  reciboMesHref,
  onEntrar,
  onSair,
  onFechar,
}: MatrizFinanceiraProps & {
  pessoa: LinhaMatriz;
  mes: string;
  ancora: DOMRect;
  onEntrar: () => void;
  onSair: () => void;
  onFechar: () => void;
}) {
  const router = useRouter();
  const tituloId = useId();
  const [pending, start] = useTransition();
  const [emAndamento, setEmAndamento] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [montado, setMontado] = useState(false);
  const itens: ItemMatriz[] = pessoa.meses[mes] ?? [];
  const t = totais(itens);
  const mesIso = `${ano}-${mes}`;

  useEffect(() => setMontado(true), []);

  // Clique fora fecha (o card vive num portal, fora da tabela).
  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest?.("td")) onFechar();
    };
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, [onFechar]);

  function executar(chave: string, acao: () => Promise<ActionResult>) {
    setErro(null);
    setEmAndamento(chave);
    start(async () => {
      const r = await acao();
      setEmAndamento(null);
      if (!r.ok) setErro(r.erro ?? "Não foi possível registrar.");
      else router.refresh();
    });
  }

  if (!montado) return null;

  // Celular: folha presa embaixo. Notebook: card abaixo da célula, sem sair da tela.
  const celular = window.innerWidth < 640;
  const largura = 360;
  const esquerda = Math.min(Math.max(8, ancora.left + ancora.width / 2 - largura / 2), window.innerWidth - largura - 8);
  const abaixo = ancora.bottom + 8;
  const cabeEmbaixo = abaixo + 320 < window.innerHeight;
  const estilo: React.CSSProperties = celular
    ? { position: "fixed", left: 8, right: 8, bottom: 8 }
    : cabeEmbaixo
      ? { position: "fixed", left: esquerda, top: abaixo, width: largura }
      : { position: "fixed", left: esquerda, bottom: window.innerHeight - ancora.top + 8, width: largura };

  const pendentes = itens.filter((i) => i.estado !== "ok").length;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={tituloId}
      style={estilo}
      onMouseEnter={onEntrar}
      onMouseLeave={onSair}
      className="z-[1003] max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-card p-4 text-sm text-ink shadow-[0_12px_32px_rgba(15,23,42,0.22)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id={tituloId} className="truncate font-semibold">
            {pessoa.nome}
          </p>
          <p className="text-xs text-muted">{mesPorExtenso(mesIso).replace(/^./, (c) => c.toUpperCase())}</p>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="-mr-2 -mt-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
          <Marca ok={false} grande />
        </button>
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-surface px-3 py-2 text-center tabular-nums">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted">Total</dt>
          <dd className="font-semibold">{formatBRL(t.total)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted">{rotulos.ok}</dt>
          <dd className="font-semibold text-ok">{formatBRL(t.recebido)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted">{rotulos.pendente}</dt>
          <dd className={`font-semibold ${t.aReceber > 0 ? "text-danger" : "text-muted"}`}>{formatBRL(t.aReceber)}</dd>
        </div>
      </dl>

      <ul className="mt-3 flex flex-col divide-y divide-line">
        {itens.map((i) => {
          const ok = i.estado === "ok";
          const atrasado = itemAtrasado(i, hoje);
          const carregando = pending && emAndamento === i.id;
          return (
            <li key={i.id} className="flex items-center gap-2 py-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => executar(i.id, () => alternarItem(i.id, !ok))}
                aria-label={ok ? `${i.titulo}: ${rotulos.ok}. Tocar para marcar como ${rotulos.pendente.toLowerCase()}` : `${i.titulo}: ${rotulos.pendente}. Tocar para marcar como ${rotulos.ok.toLowerCase()}`}
                title={ok ? `Marcar como ${rotulos.pendente.toLowerCase()}` : `Marcar como ${rotulos.ok.toLowerCase()}`}
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-60 ${
                  ok ? "border-ok bg-tint-ok text-ok" : "border-danger/60 bg-tint-danger text-danger"
                }`}
              >
                {carregando ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : <Marca ok={ok} grande />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{i.titulo}</p>
                <p className="truncate text-xs text-muted">
                  {formatData(i.data)}
                  {i.detalhe ? ` · ${i.detalhe}` : ""}
                  {i.estado === "informado" ? ` · ${rotulos.informado ?? "informado"}` : atrasado ? " · em atraso" : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span className="font-semibold tabular-nums">{formatBRL(i.valor)}</span>
                {i.reciboHref ? (
                  <Link href={i.reciboHref} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand underline">
                    Recibo
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {erro ? <p className="mt-2 text-xs text-danger">{erro}</p> : null}

      {marcarMesPago || reciboMesHref ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          {marcarMesPago && pendentes > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => executar("mes", () => marcarMesPago(pessoa.pessoaId, mesIso))}
              className="btn-action h-11 flex-1 px-3 text-sm"
            >
              {pending && emAndamento === "mes" ? "Marcando…" : "Marcar mês como pago"}
            </button>
          ) : null}
          {reciboMesHref ? (
            <Link href={preencher(reciboMesHref, pessoa.pessoaId, mesIso)} target="_blank" rel="noopener noreferrer" className="btn-ghost inline-flex h-11 flex-1 items-center justify-center px-3 text-sm">
              Recibo do mês
            </Link>
          ) : null}
        </div>
      ) : null}
      <p className="mt-2 text-[11px] text-muted">
        {itens.length} {itens.length === 1 ? "serviço" : "serviços"} {sufixoValor ? `· valores ${sufixoValor}` : ""}
      </p>
    </div>,
    document.body,
  );
}
