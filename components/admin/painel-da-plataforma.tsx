import Link from "next/link";
import type { ResumoDaPlataforma } from "@/lib/admin/consultas";
import type { AppRole } from "@/lib/auth/roles";
import { papelLabel, PAPEL_LABEL } from "@/lib/papel-label";
import { formatBRL, formatData } from "@/lib/format";
import { dataEmSaoPaulo } from "@/lib/datas";

/**
 * "Painel da plataforma": conteúdo do Início do SysAdmin — troca o Início
 * genérico (sem Hero: CLAUDE.md, decisão do Leonardo em 09/09/2026 — SysAdmin
 * e Administrador não veem o Hero, precisam de um dashboard operacional
 * próprio). Segue o mesmo padrão visual e de leitura do "Painel da praça" do
 * Administrador (`components/admin/painel-da-praca.tsx`, lote A4): números
 * primeiro — cada um que tem tela própria já leva a ela —, depois as listas
 * curtas. Os dados vêm prontos do servidor (`resumoDaPlataforma`,
 * lib/admin/consultas.ts), sempre recortados pelo mundo de exemplo quando o
 * ator é de exemplo (R-42, D-015); este arquivo só monta a tela, sem estado
 * próprio — dá pra ser Server Component.
 */

const ORDEM_PAPEL: Record<string, number> = {
  sysadmin: 0,
  admin: 1,
  funcionario: 2,
  prestador_servico: 3,
  cliente: 4,
};

const ORDEM_STATUS_SERVICO: Record<string, number> = {
  pendente: 0,
  confirmado: 1,
  realizado: 2,
  cancelado: 3,
};

/** Rótulos de `servicos.status` (migration 0024) — os mesmos 4 valores possíveis. */
const STATUS_SERVICO_LABEL: Record<string, string> = {
  pendente: "Pendentes",
  confirmado: "Confirmados",
  realizado: "Realizados",
  cancelado: "Cancelados",
};

function ordenar(chaves: string[], ordem: Record<string, number>): string[] {
  return [...chaves].sort((a, b) => (ordem[a] ?? 99) - (ordem[b] ?? 99));
}

/**
 * Um número do painel — card simples, ou link (44px) quando existe uma tela
 * pra ele. `n` decide a cor (tone "danger" só pinta com algo > 0); `exibir`
 * sobrescreve o texto mostrado (ex.: moeda formatada) sem mudar essa conta.
 */
function Numero({
  n,
  rotulo,
  href,
  tone,
  exibir,
}: {
  n: number;
  rotulo: string;
  href?: string;
  tone?: "danger";
  exibir?: string;
}) {
  const cor = tone === "danger" && n > 0 ? "text-danger" : "text-brand";
  const miolo = (
    <>
      <p className={`text-xl font-bold ${cor}`}>{exibir ?? n}</p>
      <p className="text-xs text-muted">{rotulo}</p>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="card flex min-h-11 flex-col items-center justify-center gap-0.5 py-3 text-center transition hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {miolo}
      </Link>
    );
  }
  return <div className="card flex flex-col items-center gap-0.5 py-3 text-center">{miolo}</div>;
}

/** Painel completo do SysAdmin: selo de exemplo, números por seção, listas curtas. */
export function PainelDaPlataforma({ resumo, exemplo }: { resumo: ResumoDaPlataforma; exemplo: boolean }) {
  const papeis = ordenar(Object.keys(resumo.usuariosPorPapel), ORDEM_PAPEL);
  const statusServico = ordenar(Object.keys(resumo.servicosPorStatus), ORDEM_STATUS_SERVICO);

  return (
    <div className="flex flex-col gap-5">
      <div>
        {/* h2, não h1: a página já tem o h1 dela (a saudação, acima) — este é
            o título do painel dentro da tela, não da página. */}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Plataforma</p>
        <h2 className="mt-0.5 text-2xl font-bold tracking-tight">Painel da plataforma</h2>
        <p className="mt-1 text-sm text-muted">Números da plataforma inteira, agora.</p>
      </div>

      {exemplo ? (
        <div className="rounded-2xl border border-accent bg-tint-warn px-4 py-3 text-sm text-tint-warn-ink">
          <span className="font-semibold">Mundo de exemplo</span> — os números abaixo contam só as contas e os
          registros de exemplo. Uma conta real de SysAdmin vê a plataforma inteira.
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted">Usuários</h3>
        {papeis.length === 0 ? (
          <p className="card-vazio">Nenhum usuário neste recorte ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {papeis.map((p) => (
              // Rótulo NEUTRO (não `papelLabel`): a contagem agrupa gente de
              // gêneros diferentes sob um papel só, sem uma pessoa pra concordar.
              <Numero
                key={p}
                n={resumo.usuariosPorPapel[p] ?? 0}
                rotulo={PAPEL_LABEL[p as AppRole] ?? p}
                href="/admin/usuarios"
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted">Serviços</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {statusServico.map((s) => (
            <Numero
              key={s}
              n={resumo.servicosPorStatus[s] ?? 0}
              rotulo={STATUS_SERVICO_LABEL[s] ?? s}
              href="/admin/servicos"
            />
          ))}
          <Numero n={resumo.faturamento30d} rotulo="faturado (30 dias)" exibir={formatBRL(resumo.faturamento30d)} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted">Anúncios, exclusões e denúncias</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Numero n={resumo.anunciosAtivos.servico} rotulo="anúncios de serviço ativos" />
          <Numero n={resumo.anunciosAtivos.vaga_ajudante} rotulo="vagas para ajudante ativas" />
          <Numero
            n={resumo.pedidosDeExclusaoPendentes}
            rotulo="pedidos de exclusão pendentes"
            href="/admin/pedidos-de-exclusao"
            tone="danger"
          />
          <Numero n={resumo.denunciasAbertas} rotulo="denúncias abertas" href="/admin/denuncias" tone="danger" />
          <Numero n={resumo.pracas} rotulo="praças" href="/admin/pracas" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* `min-w-0`: item de grid tem `min-width: auto` por padrão — sem isto,
            a coluna cresce pra caber a linha mais larga (data + status sem
            quebra) e empurra a página inteira pra fora do viewport no
            celular, em vez do `truncate` de dentro cortar o texto. */}
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-muted">Últimos cadastros</h3>
          {resumo.ultimosCadastros.length === 0 ? (
            <p className="card-vazio">Nenhum cadastro neste recorte ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {resumo.ultimosCadastros.map((c, i) => (
                <div key={i} className="card flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.nome || "—"}</p>
                    <p className="text-xs text-muted">{papelLabel(c.papel as AppRole, c.genero)}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted">{formatData(dataEmSaoPaulo(new Date(c.criadoEm)))}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-muted">Últimos serviços</h3>
          {resumo.ultimosServicos.length === 0 ? (
            <p className="card-vazio">Nenhum serviço neste recorte ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {resumo.ultimosServicos.map((s, i) => (
                <div key={i} className="card flex items-center justify-between gap-2 py-2.5">
                  <p className="min-w-0 truncate text-sm">{s.descricao}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs font-semibold uppercase text-muted">
                      {STATUS_SERVICO_LABEL[s.status] ?? s.status}
                    </span>
                    <p className="text-xs text-muted">{formatData(dataEmSaoPaulo(new Date(s.criadoEm)))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
