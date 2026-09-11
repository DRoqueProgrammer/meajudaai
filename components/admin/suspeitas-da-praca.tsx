"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/actions/auth";
import { Avatar, FormError } from "@/components/ui";
import { FlagsPessoa, type FlagPessoa } from "@/components/flags-pessoa";
import { formatData } from "@/lib/format";
import { dataEmSaoPaulo } from "@/lib/datas";

/**
 * "Suspeitas de Pilantragem" no painel da praça (migrations 0052–0055,
 * pedido do Leonardo em 10/09/2026) — três peças, importadas por
 * `components/admin/painel-da-praca.tsx`:
 *
 * 1. `SinalizacoesParaAnalisar` — as sinalizações PENDENTES das duas direções
 *    (prestador→cliente e cliente→prestador) da praça, com Aprovar/Recusar.
 * 2. `SuspeitasDoPrestador` — o botão "Suspeitas (N)" de cada prestador, que
 *    abre o painel com as suspeitas privadas, o formulário pra registrar
 *    outra, e a suspensão.
 * 3. `ClientesComSinalizacoes` — clientes da praça com sinalização (pendente
 *    ou aprovada), com a mesma suspensão.
 *
 * Todas as escritas são as actions de `lib/actions/suspeitas.ts`, passadas
 * como prop (Server Actions viajam como referência para um Client Component
 * — o mesmo padrão de `definirLimitePadraoAction` em `painel-da-praca.tsx`).
 */

const MOTIVO_SUSPEITA_LABEL: Record<string, string> = {
  comissao_nao_paga: "Não enviou o Pix da comissão",
  contato_por_fora: "Levou cliente para fora da plataforma",
  outro: "Outro",
};

const MOTIVO_SINALIZACAO_LABEL: Record<string, string> = {
  nao_pagou: "Não pagou",
  contato_por_fora: "Levou o contato para fora da plataforma",
  nao_compareceu: "Não compareceu",
  problema_no_servico: "Problema no serviço",
  outro: "Outro",
};

const PAPEL_LABEL: Record<string, string> = {
  prestador_servico: "Prestador",
  cliente: "Cliente",
};

/** Texto formal e educado, pré-preenchido no motivo que a pessoa vai ler — editável antes de confirmar. */
const TEXTO_SUSPENSAO_PADRAO: Record<"prestador_servico" | "cliente", string> = {
  prestador_servico:
    "Identificamos indícios de que combinações e pagamentos de serviços intermediados pela Me Ajuda Aí estão sendo resolvidos fora da plataforma, sem o registro e a comissão que sustentam o serviço. Por isso, sua conta foi temporariamente suspensa enquanto analisamos a situação. Se entender que houve um engano, fale com a administração pelas Mensagens.",
  cliente:
    "Identificamos indícios de comportamento que compromete a confiança entre as partes em serviços intermediados pela Me Ajuda Aí. Por isso, sua conta foi temporariamente suspensa enquanto analisamos a situação. Se entender que houve um engano, fale com a administração pelas Mensagens.",
};

export interface SuspensaoInfo {
  motivoPublico: string;
  suspensoEm: string;
}

type AcaoSuspender = (userId: string, motivoPublico: string) => Promise<ActionResult>;
type AcaoEncerrarSuspensao = (userId: string) => Promise<ActionResult>;

/**
 * Controle de suspensão de UMA pessoa (prestador ou cliente): se ativa,
 * "Suspender…" com o motivo pré-preenchido e editável; se suspensa, o selo
 * e "Encerrar suspensão". Compartilhado entre `SuspeitasDoPrestador` e
 * `ClientesComSinalizacoes`.
 */
export function SuspensaoControle({
  userId,
  nome,
  papel,
  suspensaoAtiva,
  suspender,
  encerrar,
}: {
  userId: string;
  nome: string;
  papel: "prestador_servico" | "cliente";
  suspensaoAtiva: SuspensaoInfo | null;
  suspender: AcaoSuspender;
  encerrar: AcaoEncerrarSuspensao;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState(TEXTO_SUSPENSAO_PADRAO[papel]);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (suspensaoAtiva) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-tint-danger px-2.5 py-0.5 text-xs font-medium text-danger">
          Suspenso desde {formatData(dataEmSaoPaulo(new Date(suspensaoAtiva.suspensoEm)))}
        </span>
        <button
          type="button"
          disabled={pending}
          className="btn-ghost px-3 py-1.5 text-xs"
          onClick={() =>
            start(async () => {
              setErro(null);
              const r = await encerrar(userId);
              if (r.ok) router.refresh();
              else setErro(r.erro ?? "Não foi possível encerrar a suspensão.");
            })
          }
        >
          {pending ? "Encerrando…" : "Encerrar suspensão"}
        </button>
        {erro ? <FormError className="text-xs">{erro}</FormError> : null}
      </div>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        className="text-xs font-semibold text-danger hover:underline"
        onClick={() => {
          setAberto(true);
          setErro(null);
        }}
      >
        Suspender {PAPEL_LABEL[papel]?.toLowerCase() ?? "conta"}…
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-danger/40 bg-tint-danger p-3">
      <label className="label" htmlFor={`suspender-motivo-${userId}`}>
        Motivo que {nome} vai ler
      </label>
      <textarea
        id={`suspender-motivo-${userId}`}
        className="input text-sm"
        rows={4}
        minLength={10}
        maxLength={600}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      <p className="text-right text-xs text-muted">{motivo.length}/600</p>
      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
      <div className="flex gap-2">
        <button type="button" disabled={pending} className="btn-ghost flex-1 py-2 text-xs" onClick={() => setAberto(false)}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending || motivo.trim().length < 10}
          className="btn px-3 py-2 text-xs text-danger hover:bg-tint-danger"
          onClick={() => {
            setErro(null);
            start(async () => {
              const r = await suspender(userId, motivo);
              if (r.ok) {
                setAberto(false);
                router.refresh();
              } else setErro(r.erro ?? "Não foi possível suspender.");
            });
          }}
        >
          {pending ? "Suspendendo…" : "Confirmar suspensão"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1) Sinalizações para analisar
// ---------------------------------------------------------------------------

export interface SinalizacaoPendenteInfo {
  id: string;
  autorNome: string;
  autorPapel: "prestador_servico" | "cliente";
  alvoNome: string;
  alvoPapel: "prestador_servico" | "cliente";
  /** Bandeiras já aprovadas do alvo, ANTES desta decisão — dá contexto pro Administrador. */
  alvoFlagsAprovadas: number;
  motivo: string;
  justificativa: string;
  servicoDescricao: string | null;
  /** Data do serviço (DD/MM/AAAA), se achou o horário. */
  servicoData: string | null;
  criadoEm: string;
}

type AcaoDecidir = (sinalizacaoId: string, aprovar: boolean) => Promise<ActionResult>;

/** Uma sinalização pendente, com Aprovar/Recusar. */
function LinhaSinalizacaoPendente({ sinalizacao, decidir }: { sinalizacao: SinalizacaoPendenteInfo; decidir: AcaoDecidir }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [decidida, setDecidida] = useState(false);

  function decidirAgora(aprovar: boolean) {
    setErro(null);
    start(async () => {
      const r = await decidir(sinalizacao.id, aprovar);
      if (r.ok) {
        setDecidida(true);
        router.refresh();
      } else setErro(r.erro ?? "Não foi possível registrar a decisão.");
    });
  }

  if (decidida) return null;

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          <strong className="font-semibold">{sinalizacao.autorNome}</strong>{" "}
          <span className="text-xs text-muted">({PAPEL_LABEL[sinalizacao.autorPapel]})</span> sinalizou{" "}
          <strong className="font-semibold text-danger">{sinalizacao.alvoNome}</strong>{" "}
          <span className="text-xs text-muted">({PAPEL_LABEL[sinalizacao.alvoPapel]})</span>
        </p>
        <span className="shrink-0 text-xs text-muted">
          {formatData(dataEmSaoPaulo(new Date(sinalizacao.criadoEm)))} às{" "}
          {new Date(sinalizacao.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
        </span>
      </div>
      <p className="text-sm">
        <span className="font-medium">Motivo:</span> {MOTIVO_SINALIZACAO_LABEL[sinalizacao.motivo] ?? sinalizacao.motivo}
      </p>
      <p className="text-sm leading-relaxed text-muted">&ldquo;{sinalizacao.justificativa}&rdquo;</p>
      {sinalizacao.servicoDescricao ? (
        <p className="text-xs text-muted">
          Serviço{sinalizacao.servicoData ? ` de ${sinalizacao.servicoData}` : ""}: {sinalizacao.servicoDescricao}
        </p>
      ) : null}
      {sinalizacao.alvoFlagsAprovadas > 0 ? (
        <p className="text-xs text-danger">
          {sinalizacao.alvoNome} já tem {sinalizacao.alvoFlagsAprovadas}{" "}
          {sinalizacao.alvoFlagsAprovadas === 1 ? "sinalização aprovada" : "sinalizações aprovadas"}.
        </p>
      ) : null}
      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          className="btn-ghost flex-1 py-2 text-sm text-danger hover:bg-tint-danger"
          onClick={() => decidirAgora(false)}
        >
          Recusar
        </button>
        <button type="button" disabled={pending} className="btn-action flex-1 py-2 text-sm" onClick={() => decidirAgora(true)}>
          {pending ? "Salvando…" : "Aprovar"}
        </button>
      </div>
    </div>
  );
}

/** Seção "Sinalizações para analisar": as pendentes das duas direções, na praça. */
export function SinalizacoesParaAnalisar({
  sinalizacoes,
  decidirSinalizacaoAction,
}: {
  sinalizacoes: SinalizacaoPendenteInfo[];
  decidirSinalizacaoAction: AcaoDecidir;
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-muted">Sinalizações para analisar</h2>
      {sinalizacoes.length === 0 ? (
        <p className="card-vazio">Nenhuma sinalização pendente nesta praça — tudo em dia.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sinalizacoes.map((s) => (
            <LinhaSinalizacaoPendente key={s.id} sinalizacao={s} decidir={decidirSinalizacaoAction} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2) Suspeitas privadas + suspensão do prestador
// ---------------------------------------------------------------------------

export interface SuspeitaInfo {
  id: string;
  motivo: string;
  descricao: string | null;
  autorNome: string;
  criadoEm: string;
}

type AcaoAdicionarSuspeita = (input: { prestadorId: string; motivo: string; descricao?: string }) => Promise<ActionResult>;
type AcaoRemoverSuspeita = (suspeitaId: string) => Promise<ActionResult>;

/** Botão "Suspeitas (N)" de um prestador — abre o painel com as suspeitas privadas, o formulário e a suspensão. */
export function SuspeitasDoPrestador({
  prestadorId,
  prestadorNome,
  suspeitas,
  flagsAprovadas,
  suspensaoAtiva,
  adicionarSuspeitaAction,
  removerSuspeitaAction,
  suspenderPrestadorAction,
  encerrarSuspensaoAction,
}: {
  prestadorId: string;
  prestadorNome: string;
  suspeitas: SuspeitaInfo[];
  flagsAprovadas: FlagPessoa[];
  suspensaoAtiva: SuspensaoInfo | null;
  adicionarSuspeitaAction: AcaoAdicionarSuspeita;
  removerSuspeitaAction: AcaoRemoverSuspeita;
  suspenderPrestadorAction: AcaoSuspender;
  encerrarSuspensaoAction: AcaoEncerrarSuspensao;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [novoMotivo, setNovoMotivo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  // Confirmação de apagar em dois cliques (id da suspeita marcada), não
  // `window.confirm`: o diálogo nativo bloqueia a validação automatizada e,
  // aqui, o próprio botão virando "Confirmar apagar?" já é o gesto explícito.
  const [apagando, setApagando] = useState<string | null>(null);

  function registrar() {
    if (!novoMotivo) {
      setErro("Escolha o motivo.");
      return;
    }
    setErro(null);
    start(async () => {
      const r = await adicionarSuspeitaAction({ prestadorId, motivo: novoMotivo, descricao: novaDescricao || undefined });
      if (r.ok) {
        setNovoMotivo("");
        setNovaDescricao("");
        router.refresh();
      } else setErro(r.erro ?? "Não foi possível registrar a suspeita.");
    });
  }

  function apagar(suspeitaId: string) {
    setErro(null);
    start(async () => {
      const r = await removerSuspeitaAction(suspeitaId);
      if (r.ok) {
        setApagando(null);
        router.refresh();
      } else setErro(r.erro ?? "Não foi possível apagar a suspeita.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${
          suspeitas.length > 0 ? "bg-tint-warn text-tint-warn-ink" : "bg-surface text-muted"
        }`}
      >
        Suspeitas ({suspeitas.length})
      </button>

      {aberto ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bandeiras aprovadas</p>
            <FlagsPessoa flags={flagsAprovadas} />
            {flagsAprovadas.length === 0 ? <span className="text-xs text-muted">nenhuma</span> : null}
          </div>

          {suspeitas.length === 0 ? (
            <p className="text-xs text-muted">Nenhuma suspeita registrada ainda.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {suspeitas.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-2 rounded-lg bg-card px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{MOTIVO_SUSPEITA_LABEL[s.motivo] ?? s.motivo}</p>
                    {s.descricao ? <p className="text-xs text-muted">{s.descricao}</p> : null}
                    <p className="text-xs text-muted">
                      {formatData(dataEmSaoPaulo(new Date(s.criadoEm)))} · registrada por {s.autorNome}
                    </p>
                  </div>
                  {apagando === s.id ? (
                    <span className="flex shrink-0 items-center gap-2 text-xs">
                      <button type="button" disabled={pending} onClick={() => apagar(s.id)} className="font-semibold text-danger hover:underline">
                        {pending ? "Apagando…" : "Confirmar apagar?"}
                      </button>
                      <button type="button" disabled={pending} onClick={() => setApagando(null)} className="text-muted hover:underline">
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setApagando(s.id)} className="shrink-0 text-xs text-danger hover:underline">
                      Apagar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Registrar nova suspeita</p>
            <select className="input text-sm" value={novoMotivo} onChange={(e) => setNovoMotivo(e.target.value)}>
              <option value="">Escolha o motivo…</option>
              <option value="comissao_nao_paga">Não enviou o Pix da comissão</option>
              <option value="contato_por_fora">Levou cliente para fora da plataforma</option>
              <option value="outro">Outro</option>
            </select>
            <textarea
              className="input text-sm"
              rows={2}
              maxLength={600}
              placeholder="Descrição (opcional)"
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
            />
            <button type="button" disabled={pending || !novoMotivo} onClick={registrar} className="btn-ghost self-start px-4 py-2 text-xs">
              {pending ? "Registrando…" : "Registrar suspeita"}
            </button>
          </div>

          {erro ? <FormError className="text-xs">{erro}</FormError> : null}

          <div className="border-t border-line pt-3">
            <SuspensaoControle
              userId={prestadorId}
              nome={prestadorNome}
              papel="prestador_servico"
              suspensaoAtiva={suspensaoAtiva}
              suspender={suspenderPrestadorAction}
              encerrar={encerrarSuspensaoAction}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3) Clientes com sinalizações
// ---------------------------------------------------------------------------

export interface ClienteComSinalizacaoInfo {
  userId: string;
  nome: string;
  fotoUrl: string | null;
  flagsAprovadas: FlagPessoa[];
  sinalizacoesPendentes: number;
  suspensaoAtiva: SuspensaoInfo | null;
}

/** Seção "Clientes com sinalizações": clientes da praça com sinalização aprovada ou pendente. */
export function ClientesComSinalizacoes({
  clientes,
  suspenderClienteAction,
  encerrarSuspensaoAction,
}: {
  clientes: ClienteComSinalizacaoInfo[];
  suspenderClienteAction: AcaoSuspender;
  encerrarSuspensaoAction: AcaoEncerrarSuspensao;
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-muted">Clientes com sinalizações</h2>
      {clientes.length === 0 ? (
        <p className="card-vazio">Nenhum cliente desta praça tem sinalização registrada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {clientes.map((c) => (
            <div key={c.userId} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar nome={c.nome} fotoUrl={c.fotoUrl} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{c.nome}</p>
                    <FlagsPessoa flags={c.flagsAprovadas} />
                  </div>
                  {c.sinalizacoesPendentes > 0 ? (
                    <p className="text-xs text-tint-warn-ink">
                      {c.sinalizacoesPendentes} {c.sinalizacoesPendentes === 1 ? "sinalização" : "sinalizações"} pendente
                      {c.sinalizacoesPendentes === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
              </div>
              <SuspensaoControle
                userId={c.userId}
                nome={c.nome}
                papel="cliente"
                suspensaoAtiva={c.suspensaoAtiva}
                suspender={suspenderClienteAction}
                encerrar={encerrarSuspensaoAction}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
