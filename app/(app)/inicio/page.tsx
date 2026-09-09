import Link from "next/link";
import { getCurrentUser, type AppRole } from "@/lib/auth/roles";
import { getAllowedModules } from "@/lib/auth/modules";
import { createServerClient } from "@/lib/supabase/server";
import { PANEL_MODULES } from "@/lib/modules";
import { boasVindas } from "@/lib/saudacao";
import { HeroCard } from "@/components/hero-card";
import { PerfilPopover } from "@/components/perfil-popover";
import { formatBRL, formatData, formatHora } from "@/lib/format";

const STATUS_ESTILO: Record<string, string> = {
  pendente: "bg-tint-warn text-tint-warn-ink",
  confirmado: "bg-tint-ok text-ok",
  cancelado: "bg-tint-danger text-danger",
  realizado: "bg-tint-neutral text-ink",
};

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * CTA primário do dia — a tela abria com um card cinza e nenhum botão, sem
 * caminho para a ação principal (publicar uma diária ou buscar trabalho).
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
      <p className={`mt-3 text-sm font-semibold ${tone === "action" ? "text-ok" : "text-brand"}`}>{cta}</p>
    </Link>
  );
}

/** Rota `/inicio`: home pós-login, com atalhos e conteúdo adaptados ao papel do usuário. */
export default async function InicioPage() {
  const user = await getCurrentUser();
  const sb = await createServerClient();
  const { data: perfil } = await sb
    .from("profiles")
    .select("nome, cidade, genero")
    .eq("user_id", user!.id)
    .maybeSingle();
  const primeiroNome = (perfil?.nome ?? "").split(" ")[0] || "por aí";
  const minhaCidade = perfil?.cidade ?? null;

  // Banner discricionário do sysadmin (RLS: só volta se ativo — ou se sysadmin).
  const { data: banner } = await sb
    .from("home_banner")
    .select("texto")
    .eq("id", 1)
    .eq("ativo", true)
    .maybeSingle();

  const isEmpresa = user!.role === "admin" || user!.role === "funcionario";
  const permitidos = user!.role === "funcionario" ? await getAllowedModules(user!) : null;
  const podePublicar = user!.role === "admin" || !!permitidos?.has("vagas");

  // "vagas" já tem card próprio acima; aqui ficam os módulos que sobraram do rodapé.
  const modulosPainel = PANEL_MODULES.filter(
    (m) => m.key !== "vagas" && (user!.role === "admin" || permitidos?.has(m.key)),
  );

  const hojeStr = new Date().toLocaleDateString("sv-SE");

  // Prestador v2: a home não tem mais "vagas" (isso é do fluxo de diária por
  // workspace, v1) — o que importa aqui é a agenda de hoje, quanto está
  // pendente de resposta, e um número simples de faturamento do mês.
  let agendaHoje: { id: string; hora_inicio: string; hora_fim: string; descricao: string | null; status: string }[] = [];
  let pendentesCount = 0;
  let faturamentoMes = 0;
  if (user!.role === "prestador_servico") {
    const { data: slotsHoje } = await sb
      .from("agenda_slots")
      .select("id, hora_inicio, hora_fim, status")
      .eq("prestador_id", user!.id)
      .eq("data", hojeStr)
      .order("hora_inicio", { ascending: true });
    const idsHoje = (slotsHoje ?? []).map((s) => s.id);
    const { data: servicosHoje } = idsHoje.length
      ? await sb.from("servicos").select("slot_id, descricao, status").in("slot_id", idsHoje)
      : { data: [] };
    const servicoPorSlot = new Map((servicosHoje ?? []).map((s) => [s.slot_id, s]));
    agendaHoje = (slotsHoje ?? []).map((s) => {
      const serv = servicoPorSlot.get(s.id);
      return { id: s.id, hora_inicio: s.hora_inicio, hora_fim: s.hora_fim, descricao: serv?.descricao ?? null, status: serv?.status ?? s.status };
    });

    const { count } = await sb
      .from("servicos")
      .select("id", { count: "exact", head: true })
      .eq("prestador_id", user!.id)
      .eq("status", "pendente");
    pendentesCount = count ?? 0;

    const primeiroDiaMes = `${hojeStr.slice(0, 7)}-01`;
    const { data: slotsMes } = await sb
      .from("agenda_slots")
      .select("id")
      .eq("prestador_id", user!.id)
      .gte("data", primeiroDiaMes)
      .lte("data", hojeStr);
    const idsMes = (slotsMes ?? []).map((s) => s.id);
    if (idsMes.length) {
      const { data: realizadosMes } = await sb
        .from("servicos")
        .select("preco_valor")
        .in("slot_id", idsMes)
        .eq("status", "realizado");
      faturamentoMes = (realizadosMes ?? []).reduce((soma, s) => soma + s.preco_valor, 0);
    }
  }

  let ultimosServicos: {
    id: string;
    descricao: string;
    preco_valor: number;
    status: string;
    prestador_id: string;
  }[] = [];
  const perfilPrestadorDe = new Map<
    string,
    { nome: string; foto_url: string | null; genero: string | null; tipo_base: string; nota_media: number; total_avaliacoes: number; verificado: boolean }
  >();
  if (user!.role === "cliente") {
    const { data: servicos } = await sb
      .from("servicos")
      .select("id, descricao, preco_valor, status, prestador_id")
      .eq("cliente_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5);
    ultimosServicos = servicos ?? [];
    const prestadorIds = [...new Set(ultimosServicos.map((s) => s.prestador_id))];
    if (prestadorIds.length) {
      const { data: prestadores } = await sb
        .from("profiles")
        .select("user_id, nome, foto_url, genero, tipo_base, nota_media, total_avaliacoes, verificado")
        .in("user_id", prestadorIds);
      for (const p of prestadores ?? []) perfilPrestadorDe.set(p.user_id, p);
    }
  }

  const painel =
    user!.role === "prestador_servico"
      ? "Painel do prestador"
      : user!.role === "cliente"
        ? "Painel do cliente"
        : user!.role === "funcionario"
          ? "Painel do funcionário"
          : "Painel do profissional";

  return (
    <div className="flex flex-col gap-5">
      {banner?.texto ? (
        <div className="rounded-2xl border border-accent bg-tint-warn px-4 py-3 text-sm text-tint-warn-ink">
          {banner.texto}
        </div>
      ) : null}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{painel}</p>
        {user!.role === "funcionario" ? (
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {boasVindas(perfil?.genero ?? null, primeiroNome)} {saudacao()}.
          </h1>
        ) : (
          <div className="mt-2">
            <HeroCard nome={primeiroNome} genero={perfil?.genero ?? null} cidade={minhaCidade} />
          </div>
        )}
        <p className="mt-2 text-sm text-muted">O que você precisa hoje?</p>
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
        ) : user!.role === "cliente" ? (
          <>
            <CtaGrande
              href="/buscar-prestador"
              titulo="PRECISO DE UM SERVIÇO"
              desc="Busque um prestador perto de você e agende direto."
              tone="accent"
            />
            <AcaoCard
              href="/meus-servicos"
              titulo="Meus serviços"
              desc="Acompanhe os agendamentos que você fez."
              cta="Abrir →"
              tone="brand"
            />
          </>
        ) : user!.role === "prestador_servico" ? (
          <>
            <AcaoCard
              href="/agenda"
              titulo="Minha agenda"
              desc="Abrir horários, aceitar e acompanhar serviços."
              cta="Abrir →"
              tone="brand"
            />
            <AcaoCard
              href="/clientes"
              titulo="Meus clientes"
              desc="Histórico de quem você já atendeu."
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
              desc="Seus horários e serviços agendados."
              cta="Abrir →"
              tone="brand"
            />
          </>
        )}
      </div>

      {user!.role === "prestador_servico" ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="card flex flex-col items-center gap-0.5 py-3 text-center">
            <p className="text-xl font-bold text-brand">{agendaHoje.length}</p>
            <p className="text-xs text-muted">hoje</p>
          </div>
          <Link
            href="/clientes"
            className={`flex flex-col items-center gap-0.5 rounded-2xl border py-3 text-center transition ${
              pendentesCount > 0 ? "border-accent bg-tint-warn" : "border-line bg-card"
            }`}
          >
            <p className={`text-xl font-bold ${pendentesCount > 0 ? "text-tint-warn-ink" : "text-brand"}`}>{pendentesCount}</p>
            <p className={`text-xs ${pendentesCount > 0 ? "text-tint-warn-ink" : "text-muted"}`}>aguardando você</p>
          </Link>
          <div className="card flex flex-col items-center gap-0.5 py-3 text-center">
            <p className="text-xl font-bold text-brand">{formatBRL(faturamentoMes)}</p>
            <p className="text-xs text-muted">faturado no mês</p>
          </div>
        </div>
      ) : null}

      {user!.role === "cliente" ? (
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted">Últimos serviços</h2>
            <Link href="/meus-servicos" className="text-sm font-semibold text-brand">
              Ver todos →
            </Link>
          </div>
          {ultimosServicos.length === 0 ? (
            <p className="card-vazio">Você ainda não agendou nenhum serviço.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {ultimosServicos.map((s) => {
                const p = perfilPrestadorDe.get(s.prestador_id);
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-card px-3 py-2.5">
                    <div className="min-w-0">
                      {p ? (
                        <PerfilPopover
                          perfil={{
                            userId: s.prestador_id,
                            nome: p.nome,
                            fotoUrl: p.foto_url,
                            genero: p.genero,
                            papel: p.tipo_base as AppRole,
                            notaMedia: p.nota_media,
                            totalAvaliacoes: p.total_avaliacoes,
                            verificado: p.verificado,
                          }}
                        />
                      ) : (
                        <span className="text-sm font-semibold">Prestador</span>
                      )}
                      <p className="truncate text-xs text-muted">{s.descricao}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-brand">{formatBRL(s.preco_valor)}</p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_ESTILO[s.status] ?? "bg-surface text-muted"}`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

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
                className="flex min-h-11 items-center justify-center rounded-xl border border-line bg-card px-3 py-3 text-center text-sm font-medium transition hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {user!.role === "prestador_servico" ? (
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted">Hoje</h2>
            <Link href="/agenda" className="text-sm font-semibold text-brand">
              Ver agenda →
            </Link>
          </div>
          {agendaHoje.length === 0 ? (
            <p className="card-vazio">Nenhum horário hoje.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {agendaHoje.map((s) => (
                <Link
                  key={s.id}
                  href={`/agenda/${s.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line bg-card px-3 py-2.5 transition hover:border-brand"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted">
                      {formatHora(s.hora_inicio)}–{formatHora(s.hora_fim)}
                    </p>
                    <p className="truncate text-sm font-semibold">{s.descricao ?? "Horário livre"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_ESTILO[s.status] ?? "bg-surface text-muted"}`}>
                    {s.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
