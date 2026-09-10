import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { CONTAS_EXEMPLO } from "@/lib/auth/contas-exemplo";
import { CATEGORIAS } from "@/lib/categorias";
import { Avatar } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/logo";
import { Footer } from "@/components/footer";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

// Copy v2 (direção do parecer de marketing da vistoria) — busca por perto,
// agenda direto, avalia dos dois lados. Nada de "diária"/"candidatura": esse
// era o modelo da v1 (mural de vagas), substituído pela agenda do prestador.
const COMO_FUNCIONA = [
  ["01", "Busque por perto", "Veja prestadores da sua região, com nota de quem já contratou e preço médio do serviço."],
  ["02", "Marque um horário", "Escolha um horário livre na agenda dele e diga o que você precisa. Sem esperar candidatura, sem mural de vagas."],
  ["03", "Combine e avalie", "O prestador confirma o agendamento. No fim do serviço, os dois se avaliam — a nota fica pra sempre no perfil."],
];

function Leader({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="-translate-y-[3px] flex-1 border-b border-dotted border-[#C9CFD8]" />
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

/** Landing pública (`/`): apresenta o produto e as contas de demonstração; redireciona quem já está logado para /inicio. */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/inicio");

  // Foto das contas de exemplo. Precisa de client admin: a landing é pública e a
  // policy `profiles_select_all` (0001) só libera leitura para `authenticated`.
  // São 4 linhas conhecidas, casadas por nome — nada de uuid fixo no código.
  const nomesDemo = Object.values(CONTAS_EXEMPLO).map((c) => c.nome);
  const { data: perfisDemo } = await createAdminClient()
    .from("profiles")
    .select("nome, foto_url")
    .in("nome", nomesDemo);
  const fotoDe = new Map((perfisDemo ?? []).map((p) => [p.nome, p.foto_url]));

  return (
    <div className="flex min-h-screen flex-col bg-card tabular-nums text-ink">
      {/* CTA compacto e "Entrar" só a partir de ~400px (min-[400px]:) — em
          390px (o viewport mais comum) as duas variantes maiores cortavam o
          "Criar conta"; ver parecer de design da vistoria, direção (g). */}
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-line bg-card/90 px-4 backdrop-blur md:gap-6 md:px-8">
        <Logo />
        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle className="grid h-10 w-10 place-items-center rounded-[10px] text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" />
          <Link
            href="/login"
            className="hidden text-sm font-semibold text-muted hover:text-ink min-[400px]:inline"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-[10px] bg-brand-fill px-4 py-2 text-sm font-semibold text-white hover:bg-brand-fillhover"
          >
            Criar conta
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-[1200px] items-start gap-14 px-8 pb-16 pt-[72px] lg:grid-cols-[1.05fr_.95fr]">
            <div className="flex flex-col gap-[22px]">
              <p className="text-rotulo font-semibold uppercase tracking-[0.12em] text-muted">
                Marketplace de Serviços de Manutenção Civil
              </p>
              {/* Display só a partir do desktop (lg, mesmo ponto em que o grid
                  vira 2 colunas abaixo); no mobile o H1 é fixo em text-3xl —
                  direção (g) do parecer de design. */}
              <h1 className="text-pretty text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] lg:text-display">
                Quem precisa e quem faz,{" "}
                <span className="[-webkit-box-decoration-break:clone] [box-decoration-break:clone] underline decoration-accent decoration-[0.14em] underline-offset-[6px]">
                  no mesmo lugar
                </span>
                .
              </h1>
              <p className="max-w-[46ch] text-base leading-[1.65] text-muted">
                Veja a agenda de eletricistas, pedreiros e encanadores perto de você e marque um
                horário direto com quem tem a melhor nota — sem grupo de WhatsApp, sem esperar
                candidato, sem ligar pra saber se ele está livre.
              </p>
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/cadastro?papel=cliente"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-fill px-[26px] text-base font-semibold text-white hover:bg-brand-fillhover sm:h-auto sm:w-auto sm:py-4"
                >
                  Preciso contratar
                </Link>
                <Link
                  href="/cadastro?papel=prestador_servico"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-action-dark px-[26px] text-base font-semibold text-white hover:bg-action-deep sm:h-auto sm:w-auto sm:py-4"
                >
                  Quero prestar serviço
                </Link>
              </div>
              <div className="mt-[18px] flex flex-col gap-2.5 border-t border-line pt-[18px]">
                <Leader label="Categorias de Prestadores de Serviços" value={String(CATEGORIAS.length)} />
                <Leader label="Avaliação ao fim do serviço" value="dos 2 lados" />
              </div>
            </div>

            {/* Contas de exemplo — reais e editáveis, uma por papel (ver lib/auth/contas-exemplo.ts) */}
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-[18px]">
              <p className="text-rotulo font-semibold uppercase tracking-[0.1em] text-muted">
                Ver por dentro · contas de exemplo
              </p>
              {Object.entries(CONTAS_EXEMPLO).map(([papel, c]) => (
                <a
                  key={papel}
                  href={`/api/exemplo/entrar?papel=${papel}`}
                  className="group flex items-center gap-3.5 rounded-xl border border-line bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,.07)] hover:border-brand"
                >
                  <Avatar nome={c.nome} fotoUrl={fotoDe.get(c.nome) ?? null} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{c.nome}</p>
                      <span className="rounded-full bg-tint-info px-2 py-0.5 text-rotulo font-semibold text-brand">
                        {c.papel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{c.blurb}</p>
                  </div>
                  <span className="text-lg text-muted transition group-hover:text-brand">→</span>
                </a>
              ))}
              <p className="text-xs text-muted">
                <span className="font-semibold text-muted">Aviso:</span> contas fictícias criadas
                pra demonstração — dados e histórico são simulados, mas as contas funcionam
                normalmente (dá pra editar).
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-[1200px] px-8 py-[60px]">
            <p className="mb-[22px] text-rotulo font-semibold uppercase tracking-[0.12em] text-muted">
              Como funciona
            </p>
            <div className="grid overflow-hidden rounded-[14px] border border-line bg-card md:grid-cols-3">
              {COMO_FUNCIONA.map(([num, tit, desc], i) => (
                <div key={num} className={`p-[30px] ${i < 2 ? "md:border-r md:border-line" : ""}`}>
                  <p className="text-3xl font-extrabold leading-none text-line">{num}</p>
                  <p className="mt-3.5 text-lg font-semibold leading-[1.25] tracking-[-0.02em]">
                    {tit}
                  </p>
                  <p className="mt-2 text-sm text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-line">
          <div className="mx-auto max-w-[1200px] px-8 py-14">
            <p className="mb-2 text-rotulo font-semibold uppercase tracking-[0.12em] text-muted">
              Categorias
            </p>
            <p className="mb-6 max-w-[52ch] text-sm text-muted">
              Da obra ao acabamento: encontre — ou ofereça — ajuda na sua área.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {CATEGORIAS.map((c) => (
                <span
                  key={c.slug}
                  className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium"
                >
                  {c.nome}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-brand-fill">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-7 px-8 py-10">
            <div>
              <p className="text-rotulo font-semibold uppercase tracking-[0.12em] text-white/70">
                Comece agora
              </p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.02em] text-white">
                Encontre um profissional de confiança perto de você — ou comece a receber pedidos
                de agendamento hoje.
              </p>
            </div>
            <Link
              href="/cadastro"
              className="rounded-[10px] bg-white px-[22px] py-[13px] text-sm font-semibold text-brand-fill hover:bg-accent"
            >
              Criar conta
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
