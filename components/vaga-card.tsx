import Link from "next/link";
import { StatusBadge } from "./ui";
import { CategoriaIcon } from "./icons";
import { LinkPendente } from "./link-pendente";
import { formatBRL, formatData, formatHora } from "@/lib/format";
import { nomeCategoria } from "@/lib/categorias";

/** O mínimo que o card lê. Tanto a linha completa de `vagas` quanto o item
 *  montado da agenda satisfazem isto. */
type VagaLike = {
  titulo: string;
  categoria: string;
  cidade: string;
  bairro: string | null;
  valor_diaria: number;
  data_servico: string | null;
  hora_inicio: string | null;
  status: string;
  descricao?: string | null;
};

/**
 * Card de vaga — um só para o feed, a lista de vagas, minhas diárias e a agenda.
 * Antes eram três desenhos do mesmo objeto (aqui, em minhas-diarias e no Cartao
 * da agenda), cada um com emoji e espaçamento próprios. A chrome (ícone, título,
 * badge, empilhar no mobile) vive aqui; o que varia por tela entra pelos slots
 * `subtitle`, `meta` e `actions`.
 */
/** Card resumido de uma vaga (título, categoria, local, data/valor e status) usado nas listas e na agenda. */
export function VagaCard({
  vaga,
  href,
  status,
  subtitle,
  meta,
  descricao = false,
  candidatos,
  actions,
}: {
  vaga: VagaLike;
  /** Com href o card inteiro é clicável; sem, é um contêiner com ações próprias. */
  href?: string;
  /** Sobrescreve o status do badge (ex.: status da candidatura, não o da vaga). */
  status?: string;
  /** Linha sob o título. Padrão: categoria · cidade[, bairro]. */
  subtitle?: React.ReactNode;
  /** Linha de baixo. Padrão: valor + data/hora. Passe para trocar o conteúdo. */
  meta?: React.ReactNode;
  /** Mostra a descrição da vaga quando houver. */
  descricao?: boolean;
  candidatos?: number;
  /** Ações abaixo da linha de baixo (ex.: Chat, Avaliar). */
  actions?: React.ReactNode;
}) {
  const conteudo = (
    <>
      {/* Mobile: badge desce pra própria linha — a "Aberta para candidatos"
          (~160px) num card de 375px espremia o título a ~1/3 da largura. Em
          sm+ há espaço de sobra e ela volta pro canto superior direito. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
            <CategoriaIcon slug={vaga.categoria} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold leading-tight">{vaga.titulo}</p>
            <p className="mt-1 text-[12.5px] text-muted">
              {subtitle ?? (
                <>
                  {nomeCategoria(vaga.categoria)} · {vaga.cidade}
                  {vaga.bairro ? `, ${vaga.bairro}` : ""}
                </>
              )}
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-2 pl-14 sm:self-start sm:pl-0">
          {href ? <LinkPendente className="text-brand" /> : null}
          <StatusBadge status={status ?? vaga.status} />
        </span>
      </div>

      {descricao && vaga.descricao ? (
        <p className="mt-3 text-[13px] leading-relaxed text-muted">{vaga.descricao}</p>
      ) : null}

      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-[#EEF1F5] pt-3">
        {meta ?? (
          <>
            <span className="text-[20px] font-bold text-brand">
              {formatBRL(vaga.valor_diaria)}{" "}
              <span className="text-xs font-normal text-muted">/ diária</span>
            </span>
            <span className="text-[12.5px] font-medium text-muted">
              {formatData(vaga.data_servico)} {formatHora(vaga.hora_inicio)}
            </span>
          </>
        )}
      </div>

      {typeof candidatos === "number" ? (
        <p className="mt-2 text-xs font-medium text-muted">
          {candidatos} candidato{candidatos === 1 ? "" : "s"}
        </p>
      ) : null}

      {actions ? <div className="mt-3 flex flex-wrap gap-3">{actions}</div> : null}
    </>
  );

  const base =
    "block rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]";
  return href ? (
    <Link href={href} className={`${base} transition hover:border-brand`}>
      {conteudo}
    </Link>
  ) : (
    <div className={base}>{conteudo}</div>
  );
}
