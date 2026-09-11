"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/actions/auth";
import { LIMITE_MAXIMO, LIMITE_PADRAO_PLATAFORMA } from "@/lib/anuncios/regras";
import { Avatar, FormError } from "@/components/ui";
import { nomeCategoria } from "@/lib/categorias";

/**
 * "Painel da praça": conteúdo do Início do Administrador (troca o mural de
 * vagas v1 — "PRECISO DE AJUDANTE"/"Minhas vagas" —, que não fazia sentido
 * pro papel). Decisão do Leonardo em 10/09/2026: o Administrador define
 * quantos anúncios ATIVOS cada prestador da praça pode ter — um padrão pra
 * praça inteira e, por cima, um ajuste por prestador — e modera (tira/devolve
 * do ar) os anúncios publicados. Os dados vêm prontos do servidor
 * (`app/(app)/inicio/page.tsx`, lib/admin/consultas.ts); este arquivo só
 * coleta os formulários e chama as actions de `lib/actions/anuncios-admin.ts`.
 */

const TIPO_LABEL: Record<string, string> = {
  servico: "Serviço",
  vaga_ajudante: "Vaga p/ ajudante",
};

const STATUS_ESTILO: Record<string, string> = {
  ativo: "bg-tint-ok text-ok",
  pausado: "bg-tint-neutral text-muted",
  encerrado: "bg-tint-neutral text-muted",
  moderado: "bg-tint-danger text-danger",
};

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  encerrado: "Encerrado",
  moderado: "Tirado do ar",
};

function Numero({ n, rotulo, tone }: { n: number; rotulo: string; tone?: "danger" }) {
  return (
    <div className="card flex flex-col items-center gap-0.5 py-3 text-center">
      <p className={`text-xl font-bold ${tone === "danger" && n > 0 ? "text-danger" : "text-brand"}`}>{n}</p>
      <p className="text-xs text-muted">{rotulo}</p>
    </div>
  );
}

export interface PracaAtivaInfo {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  /** `null` = ainda sem ajuste — vale `LIMITE_PADRAO_PLATAFORMA`. */
  limitePadrao: number | null;
}

export interface PrestadorDaPracaInfo {
  userId: string;
  nome: string;
  fotoUrl: string | null;
  categoria: string | null;
  /** Quantos anúncios ATIVOS este prestador tem agora. */
  ativos: number;
  /** Limite efetivo (ajuste próprio, senão o padrão da praça, senão o da plataforma — `limiteEfetivo`). */
  limite: number;
  /** `true` quando este prestador tem uma linha em `anuncio_limites` (ajuste individual, vence o padrão da praça). */
  ajusteProprio: boolean;
}

export interface AnuncioDaPracaInfo {
  id: string;
  tipo: string;
  titulo: string;
  status: string;
  prestadorId: string;
  prestadorNome: string;
}

type AcaoLimite = (id: string, limite: number | null) => Promise<ActionResult>;
type AcaoModerar = (anuncioId: string, tirarDoAr: boolean) => Promise<ActionResult>;

/** Painel completo — cabeçalho, números, limite da praça, prestadores e anúncios. */
export function PainelDaPraca({
  praca,
  prestadores,
  anuncios,
  definirLimitePadrao,
  definirLimitePrestador,
  moderarAnuncio,
}: {
  praca: PracaAtivaInfo;
  prestadores: PrestadorDaPracaInfo[];
  anuncios: AnuncioDaPracaInfo[];
  definirLimitePadrao: AcaoLimite;
  definirLimitePrestador: AcaoLimite;
  moderarAnuncio: AcaoModerar;
}) {
  const ativosServico = anuncios.filter((a) => a.status === "ativo" && a.tipo === "servico").length;
  const ativosVaga = anuncios.filter((a) => a.status === "ativo" && a.tipo === "vaga_ajudante").length;
  const moderados = anuncios.filter((a) => a.status === "moderado").length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        {/* h2, não h1: a página já tem o h1 dela (a saudação, acima) — este é
            o título da SEÇÃO "praça ativa" dentro do painel, não da página. */}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Praça</p>
        <h2 className="mt-0.5 text-2xl font-bold tracking-tight">{praca.nome}</h2>
        <p className="mt-1 text-sm text-muted">
          {[praca.cidade, praca.estado].filter(Boolean).join(" / ") || "Sem cidade cadastrada"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Numero n={prestadores.length} rotulo="prestadores na praça" />
        <Numero n={ativosServico} rotulo="anúncios de serviço ativos" />
        <Numero n={ativosVaga} rotulo="vagas para ajudante ativas" />
        <Numero n={moderados} rotulo="tirados do ar" tone="danger" />
      </div>

      <LimitePadraoForm praca={praca} definirLimitePadrao={definirLimitePadrao} />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted">Prestadores da praça</h2>
        {prestadores.length === 0 ? (
          <p className="card-vazio">
            Nenhum Prestador de Serviço em {praca.cidade ?? "—"} ainda. Assim que alguém se cadastrar com essa
            cidade, aparece aqui.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {prestadores.map((p) => (
              <LinhaPrestador key={p.userId} prestador={p} definirLimitePrestador={definirLimitePrestador} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted">Anúncios da praça</h2>
        {anuncios.length === 0 ? (
          <p className="card-vazio">Nenhum anúncio publicado pelos prestadores desta praça ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {anuncios.map((a) => (
              <LinhaAnuncio key={a.id} anuncio={a} moderarAnuncio={moderarAnuncio} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Padrão de anúncios ativos da praça: campo + Salvar, e "Voltar ao padrão da plataforma". */
function LimitePadraoForm({ praca, definirLimitePadrao }: { praca: PracaAtivaInfo; definirLimitePadrao: AcaoLimite }) {
  const router = useRouter();
  const [valor, setValor] = useState(praca.limitePadrao != null ? String(praca.limitePadrao) : "");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function salvar() {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 0 || n > LIMITE_MAXIMO) {
      setErro(`Informe um número inteiro entre 0 e ${LIMITE_MAXIMO}.`);
      return;
    }
    setErro(null);
    setOk(false);
    start(async () => {
      const r = await definirLimitePadrao(praca.id, n);
      if (r.ok) {
        setOk(true);
        router.refresh();
      } else setErro(r.erro ?? "Não foi possível salvar.");
    });
  }

  function voltarAoPadrao() {
    setErro(null);
    setOk(false);
    start(async () => {
      const r = await definirLimitePadrao(praca.id, null);
      if (r.ok) {
        setValor("");
        setOk(true);
        router.refresh();
      } else setErro(r.erro ?? "Não foi possível voltar ao padrão.");
    });
  }

  return (
    <div className="card flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium">Limite de anúncios da praça</p>
        <p className="text-xs text-muted">
          Quantos anúncios ATIVOS cada prestador de {praca.cidade ?? "esta cidade"} pode ter, ao mesmo tempo.
          Vale só para quem não tem um ajuste próprio, mais abaixo. Padrão atual:{" "}
          <strong className="text-ink">
            {praca.limitePadrao != null ? praca.limitePadrao : `${LIMITE_PADRAO_PLATAFORMA} — padrão da plataforma`}
          </strong>
          .
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={0}
          max={LIMITE_MAXIMO}
          className="input w-24 text-sm"
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setOk(false);
          }}
          aria-label="Novo padrão de anúncios ativos da praça"
        />
        <button type="button" onClick={salvar} disabled={pending || valor === ""} className="btn-action px-4 py-2 text-sm">
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {praca.limitePadrao != null ? (
          <button type="button" onClick={voltarAoPadrao} disabled={pending} className="btn-ghost px-4 py-2 text-sm">
            Voltar ao padrão da plataforma
          </button>
        ) : null}
        {ok ? (
          <span className="text-xs text-ok">
            Salvo <span aria-hidden="true">✓</span>
          </span>
        ) : null}
      </div>
      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
    </div>
  );
}

/** Uma linha de prestador: foto, nome, categoria, "N de X ativos", ajuste individual. */
function LinhaPrestador({
  prestador,
  definirLimitePrestador,
}: {
  prestador: PrestadorDaPracaInfo;
  definirLimitePrestador: AcaoLimite;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(String(prestador.limite));
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function salvar() {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 0 || n > LIMITE_MAXIMO) {
      setErro(`Informe um número inteiro entre 0 e ${LIMITE_MAXIMO}.`);
      return;
    }
    setErro(null);
    setOk(false);
    start(async () => {
      const r = await definirLimitePrestador(prestador.userId, n);
      if (r.ok) {
        setOk(true);
        router.refresh();
      } else setErro(r.erro ?? "Não foi possível salvar.");
    });
  }

  function usarPadrao() {
    setErro(null);
    setOk(false);
    start(async () => {
      const r = await definirLimitePrestador(prestador.userId, null);
      if (r.ok) {
        setOk(true);
        router.refresh();
      } else setErro(r.erro ?? "Não foi possível voltar ao padrão.");
    });
  }

  return (
    <div className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar nome={prestador.nome} fotoUrl={prestador.fotoUrl} />
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-sm font-semibold">
            {prestador.nome}
            {prestador.ajusteProprio ? (
              <span className="shrink-0 rounded-full bg-tint-info px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide text-brand">
                ajuste próprio
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted">
            {prestador.categoria ? `${nomeCategoria(prestador.categoria)} · ` : ""}
            {prestador.ativos} de {prestador.limite} ativos
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={0}
          max={LIMITE_MAXIMO}
          className="input w-20 text-sm"
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setOk(false);
          }}
          aria-label={`Limite de anúncios de ${prestador.nome}`}
        />
        <button type="button" onClick={salvar} disabled={pending || valor === ""} className="btn-ghost px-3 py-2 text-sm">
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {prestador.ajusteProprio ? (
          <button type="button" onClick={usarPadrao} disabled={pending} className="text-sm font-medium text-brand disabled:opacity-60">
            Usar o padrão
          </button>
        ) : null}
        {ok ? (
          <span className="text-xs text-ok">
            Salvo <span aria-hidden="true">✓</span>
          </span>
        ) : null}
      </div>
      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
    </div>
  );
}

/** Uma linha de anúncio: título, tipo, prestador, status, e o botão de moderação. */
function LinhaAnuncio({ anuncio, moderarAnuncio }: { anuncio: AnuncioDaPracaInfo; moderarAnuncio: AcaoModerar }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const moderado = anuncio.status === "moderado";

  function alternar() {
    setErro(null);
    start(async () => {
      const r = await moderarAnuncio(anuncio.id, !moderado);
      if (r.ok) router.refresh();
      else setErro(r.erro ?? "Não foi possível atualizar o anúncio.");
    });
  }

  return (
    <div className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{anuncio.titulo}</p>
        <p className="truncate text-xs text-muted">
          {TIPO_LABEL[anuncio.tipo] ?? anuncio.tipo} · {anuncio.prestadorNome}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_ESTILO[anuncio.status] ?? "bg-tint-neutral text-muted"}`}>
          {STATUS_LABEL[anuncio.status] ?? anuncio.status}
        </span>
        {anuncio.status === "encerrado" ? null : (
          <button
            type="button"
            onClick={alternar}
            disabled={pending}
            className={moderado ? "btn-ghost px-3 py-2 text-sm" : "btn px-3 py-2 text-sm text-danger hover:bg-tint-danger"}
          >
            {pending ? "Salvando…" : moderado ? "Devolver ao prestador" : "Tirar do ar"}
          </button>
        )}
      </div>
      {erro ? <FormError className="text-xs">{erro}</FormError> : null}
    </div>
  );
}
