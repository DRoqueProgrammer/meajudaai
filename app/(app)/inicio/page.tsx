import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/roles";
import { getAllowedModules } from "@/lib/auth/modules";
import { createServerClient } from "@/lib/supabase/server";
import { VagaCard } from "@/components/vaga-card";
import { PANEL_MODULES } from "@/lib/modules";

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * CTA primário do dia — a tela abria com um card cinza e nenhum botão, no
 * momento em que o produto promete "diária fechada antes do café".
 * Cores fixadas pela referência visual: amarelo para "preciso de ajudante",
 * verde para "quero trabalhar". O amarelo carrega texto #3a2f00 (8,1:1); sobre
 * branco ele daria 1,6:1 e por isso só existe como preenchimento.
 */
function CtaGrande({
  href,
  titulo,
  desc,
  tone,
}: {
  href: string;
  titulo: string;
  desc: string;
  tone: "accent" | "action";
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[7rem] flex-col justify-center gap-1 rounded-2xl px-6 py-6 shadow-[0_1px_3px_rgba(15,23,42,0.10)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        tone === "accent" ? "bg-accent text-[#3a2f00]" : "bg-action-dark text-white"
      }`}
    >
      <span className="text-xl font-bold leading-tight tracking-tight">{titulo}</span>
      {/* Branco cheio, não `text-white/85`: a mistura a 85% sobre o verde cai
          para 4,19:1 e reprova em AA. A hierarquia já vem de peso e tamanho. */}
      <span className={`text-sm leading-snug ${tone === "accent" ? "text-[#5a4700]" : "text-white"}`}>
        {desc}
      </span>
    </Link>
  );
}

function AcaoCard({
  href,
  titulo,
  desc,
  cta,
  tone,
}: {
  href: string;
  titulo: string;
  desc: string;
  cta: string;
  tone: "brand" | "action";
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-line bg-surface p-5 transition hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <p className="text-base font-semibold">{titulo}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
      <p className={`mt-3 text-sm font-semibold ${tone === "action" ? "text-action-dark" : "text-brand"}`}>{cta}</p>
    </Link>
  );
}

export default async function InicioPage() {
  const user = await getCurrentUser();
  const sb = await createServerClient();
  const { data: perfil } = await sb
    .from("profiles")
    .select("nome, cidade")
    .eq("user_id", user!.id)
    .maybeSingle();
  const primeiroNome = (perfil?.nome ?? "").split(" ")[0] || "por aí";
  const minhaCidade = perfil?.cidade ?? null;

  const isEmpresa = user!.role === "admin" || user!.role === "funcionario";
  const permitidos = user!.role === "funcionario" ? await getAllowedModules(user!) : null;
  const podePublicar = user!.role === "admin" || !!permitidos?.has("vagas");

  // "vagas" já tem card próprio acima; aqui ficam os módulos que sobraram do rodapé.
  const modulosPainel = PANEL_MODULES.filter(
    (m) => m.key !== "vagas" && (user!.role === "admin" || permitidos?.has(m.key)),
  );

  // "na sua região" só era um título: a consulta não filtrava por cidade e um
  // ajudante de Recife via cinco diárias em São Paulo. A cidade vem do cadastro
  // e já era usada no perfil e no recibo de publicação — faltava aqui.
  const hojeStr = new Date().toLocaleDateString("sv-SE");
  let feed = !isEmpresa
    ? sb
        .from("vagas")
        .select("*")
        .eq("status", "aberta")
        .gte("data_servico", hojeStr)
        .order("data_servico", { ascending: true, nullsFirst: false })
        .limit(5)
    : null;
  if (feed && minhaCidade) feed = feed.eq("cidade", minhaCidade);
  const { data: vagas } = feed ? await feed : { data: [] };

  const painel =
    user!.role === "ajudante"
      ? "Painel do ajudante"
      : user!.role === "funcionario"
        ? "Painel do funcionário"
        : "Painel do profissional";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{painel}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Olá, {primeiroNome}! {saudacao()}.
        </h1>
        <p className="mt-1 text-sm text-muted">O que você precisa hoje?</p>
      </div>

      {/* A referência visual (tela 2) pede dois CTAs grandes. Aqui o papel já é
          conhecido, então o primário é o do papel — amarelo para quem contrata,
          verde para quem trabalha — e o segundo caminho fica como card sóbrio.
          Dois CTAs de mesmo peso com um deles morto seria pior que um só. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {isEmpresa ? (
          <>
            {podePublicar ? (
              <CtaGrande
                href="/publicar"
                titulo="PRECISO DE AJUDANTE"
                desc="Publique a diária em um minuto e receba candidatos hoje."
                tone="accent"
              />
            ) : null}
            <AcaoCard
              href="/minhas-vagas"
              titulo="Minhas vagas"
              desc="Acompanhe candidatos e o andamento das diárias."
              cta="Abrir →"
              tone="brand"
            />
          </>
        ) : (
          <>
            <CtaGrande
              href="/vagas"
              titulo="QUERO TRABALHAR"
              desc="Diárias perto de você, com valor e horário na cara."
              tone="action"
            />
            <AcaoCard
              href="/agenda"
              titulo="Minha agenda"
              desc="Suas diárias confirmadas, organizadas por data."
              cta="Abrir →"
              tone="brand"
            />
          </>
        )}
      </div>

      {/* Equipe, Financeiro e Relatórios saíram do rodapé (teto de 5 itens).
          No celular, este painel é o único caminho até eles. */}
      {isEmpresa && modulosPainel.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted">Painel da equipe</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {modulosPainel.map((m) => (
              <Link
                key={m.key}
                href={m.href}
                className="flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-3 py-3 text-center text-sm font-medium transition hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {!isEmpresa ? (
        <div>
          {/* O título nomeia a cidade em vez de dizer "na sua região": o usuário
              precisa saber por qual filtro a lista passou para confiar nela. */}
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted">
              {minhaCidade ? `Próximas diárias em ${minhaCidade}` : "Próximas diárias"}
            </h2>
            <Link href="/vagas" className="text-sm font-semibold text-brand">
              Ver todas →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {(vagas ?? []).map((v) => (
              <VagaCard key={v.id} vaga={v} href={`/vagas/${v.id}`} descricao />
            ))}
            {(!vagas || vagas.length === 0) && (
              <div className="card-vazio">
                <p className="text-sm text-muted">
                  {minhaCidade
                    ? `Nenhuma diária aberta em ${minhaCidade} por enquanto.`
                    : "Nenhuma diária aberta por enquanto."}
                </p>
                {minhaCidade ? (
                  <Link href="/vagas?cidade=todas" className="btn-ghost mt-4">
                    Ver vagas de outras cidades
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
