import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { DEMO_ACCOUNTS } from "@/lib/auth/demo";
import { CATEGORIAS } from "@/lib/categorias";
import { Avatar } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/logo";
import { formatBRL } from "@/lib/format";
import { mailtoSuporte } from "@/lib/contato";

export const dynamic = "force-dynamic";

/** Diária média por categoria — número de vitrine, não vem do banco. */
const MEDIA: Record<string, number> = {
  ajudante_eletricista: 150,
  ajudante_pedreiro: 140,
  ajudante_pintor: 135,
  ajudante_encanador: 145,
  ajudante_gesseiro: 150,
  ajudante_azulejista: 145,
  ajudante_geral: 130,
};

const COMO_FUNCIONA = [
  ["01", "Publique a diária", "Serviço, local, data e valor. Um minuto e tá no ar pra quem está perto."],
  ["02", "Escolha com base em nota", "Avaliação real de quem já trabalhou com o ajudante. Sem indicação furada."],
  ["03", "Aceite e combine", "Chat liberado após o aceite. No fim do dia, todo mundo avalia."],
];

function Leader({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[13.5px] font-medium text-muted">{label}</span>
      <span className="-translate-y-[3px] flex-1 border-b border-dotted border-[#C9CFD8]" />
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/inicio");

  // Foto das contas de exemplo. Precisa de client admin: a landing é pública e a
  // policy `profiles_select_all` (0001) só libera leitura para `authenticated`.
  // São 4 linhas conhecidas, casadas por nome — nada de uuid fixo no código.
  const nomesDemo = Object.values(DEMO_ACCOUNTS).map((c) => c.nome);
  const { data: perfisDemo } = await createAdminClient()
    .from("profiles")
    .select("nome, foto_url")
    .in("nome", nomesDemo);
  const fotoDe = new Map((perfisDemo ?? []).map((p) => [p.nome, p.foto_url]));

  return (
    <div className="flex min-h-screen flex-col bg-white tabular-nums text-ink">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-6 border-b border-line bg-white/90 px-4 backdrop-blur md:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[13px] font-semibold text-muted hover:text-ink">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-[10px] bg-brand px-[18px] py-[11px] text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            Criar conta
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-[1200px] items-start gap-14 px-8 pb-16 pt-[72px] lg:grid-cols-[1.05fr_.95fr]">
            <div className="flex flex-col gap-[22px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Marketplace de diária · construção e manutenção
              </p>
              <h1
                className="font-extrabold leading-[1.08] tracking-[-0.03em]"
                style={{ fontSize: "clamp(38px,4.6vw,60px)", textWrap: "pretty" }}
              >
                Diária fechada{" "}
                <span className="[-webkit-box-decoration-break:clone] [box-decoration-break:clone] bg-[linear-gradient(transparent_58%,#FFC107_58%)] px-0.5">
                  antes do café da manhã
                </span>
                .
              </h1>
              <p className="max-w-[46ch] text-base leading-[1.65] text-muted">
                Publicou 06:40, três candidatos até 07:10, ajudante na obra às 08:00. É esse o ritmo
                que a gente resolve — pros dois lados.
              </p>
              <div className="mt-1 flex flex-wrap gap-3">
                <Link
                  href="/cadastro?papel=admin"
                  className="rounded-xl bg-brand px-[26px] py-4 text-[15px] font-semibold text-white hover:bg-brand-dark"
                >
                  Preciso de ajudante
                </Link>
                <Link
                  href="/cadastro?papel=ajudante"
                  className="rounded-xl bg-action-dark px-[26px] py-4 text-[15px] font-semibold text-white hover:bg-action-deep"
                >
                  Quero trabalhar
                </Link>
              </div>
              <div className="mt-[18px] flex flex-col gap-2.5 border-t border-line pt-[18px]">
                <Leader label="Tempo médio até o 1º candidato" value="18 min" />
                <Leader label="Diária média na região" value={formatBRL(148)} />
                <Leader label="Ajudantes com perfil verificado" value="92%" />
              </div>
            </div>

            {/* Contas de exemplo — entram no app real, em modo somente leitura */}
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-[18px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                Ver por dentro · contas de exemplo
              </p>
              {Object.entries(DEMO_ACCOUNTS).map(([who, c]) => (
                <a
                  key={who}
                  href={`/api/demo/enter?who=${who}`}
                  className="group flex items-center gap-3.5 rounded-xl border border-line bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,.07)] hover:border-brand"
                >
                  <Avatar nome={c.nome} fotoUrl={fotoDe.get(c.nome) ?? null} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14.5px] font-semibold">{c.nome}</p>
                      <span className="rounded-full bg-[#e8eff9] px-2 py-0.5 text-[11px] font-semibold text-brand">
                        {c.papel}
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] leading-[1.5] text-muted">{c.blurb}</p>
                  </div>
                  <span className="text-lg text-muted transition group-hover:text-brand">→</span>
                </a>
              ))}
              <p className="text-[12px] leading-[1.6] text-muted">
                <span className="font-semibold text-muted">Aviso:</span> as pessoas acima não
                existem — nomes e dados foram inventados para demonstração. Nada que você fizer
                nessas contas é salvo: todas são somente leitura.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-[1200px] px-8 py-[60px]">
            <p className="mb-[22px] text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Como funciona
            </p>
            <div className="grid overflow-hidden rounded-[14px] border border-line bg-white md:grid-cols-3">
              {COMO_FUNCIONA.map(([num, tit, desc], i) => (
                <div key={num} className={`p-[30px] ${i < 2 ? "md:border-r md:border-line" : ""}`}>
                  <p className="text-3xl font-extrabold leading-none text-line">{num}</p>
                  <p className="mt-3.5 text-lg font-semibold leading-[1.25] tracking-[-0.02em]">
                    {tit}
                  </p>
                  <p className="mt-2 text-[13.5px] leading-[1.6] text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-line">
          <div className="mx-auto max-w-[1200px] px-8 py-14">
            <p className="mb-[22px] text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Categorias · diária média
            </p>
            <div className="grid gap-x-14 md:grid-cols-2">
              {CATEGORIAS.map((c) => (
                <div
                  key={c.slug}
                  className="flex items-baseline gap-2.5 border-b border-[#EEF1F5] py-[11px]"
                >
                  <span className="text-sm font-medium">{c.nome}</span>
                  <span className="-translate-y-[3px] flex-1 border-b border-dotted border-[#C9CFD8]" />
                  <span className="text-[13.5px] font-bold">{formatBRL(MEDIA[c.slug] ?? 130)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-brand">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-7 px-8 py-10">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                App em breve
              </p>
              <p className="mt-2 text-[22px] font-bold leading-[1.2] tracking-[-0.02em] text-white">
                Android e iOS. Mesmas diárias, no bolso.
              </p>
            </div>
            <Link
              href="/cadastro"
              className="rounded-[10px] bg-white px-[22px] py-[13px] text-[13px] font-semibold text-ink hover:bg-accent"
            >
              Avisa quando sair
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-8 py-[26px] text-[12.5px] text-muted">
          <span>MeAjuda Aí · a ajuda que você precisa, no momento que você mais precisa.</span>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/termos" className="hover:text-brand">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-brand">
              Privacidade
            </Link>
            <a href={mailtoSuporte()} className="hover:text-brand">
              Suporte
            </a>
            <span>© 2026</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
