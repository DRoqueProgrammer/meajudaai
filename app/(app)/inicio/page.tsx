import Link from "next/link";
import { getCurrentUser, type AppRole } from "@/lib/auth/roles";
import { getAllowedModules } from "@/lib/auth/modules";
import { createServerClient } from "@/lib/supabase/server";
import { PANEL_MODULES } from "@/lib/modules";
import { boasVindas } from "@/lib/saudacao";
import { HeroCard } from "@/components/hero-card";
import { PerfilPopover } from "@/components/perfil-popover";
import { GraficoFaturamento, type MesFaturamento } from "@/components/dashboard/grafico-faturamento";
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
 * caminho para a ação principal (publicar uma vaga ou buscar trabalho).
 * Verde para "quero trabalhar" (ação positiva do prestador, direção d) segue
 * preenchimento cheio. Amarelo NUNCA é fundo de bloco grande (direção d): o
 * tone "accent" vira fundo `--tint-info` (a mesma tinta azul clara do resto
 * da casca) com um ícone amarelo — a cor de identidade sobra pro selo, não
 * pro bloco inteiro da tela.
 */
function CtaGrande({
  href,
  titulo,
  desc,
  tone,
  icone,
}: {
  href: string;
  titulo: string;
  desc: string;
  tone: "accent" | "action";
  icone?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[7rem] items-center gap-3 rounded-2xl px-5 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.10)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        tone === "accent" ? "border border-line bg-tint-info text-ink" : "bg-action-dark text-white"
      }`}
    >
      {tone === "accent" ? (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-xl" aria-hidden>
          {icone ?? "🧰"}
        </span>
      ) : null}
      <span className="flex flex-col justify-center gap-1">
        <span className="text-base font-semibold leading-tight tracking-tight">{titulo}</span>
        {/* Branco cheio no tone action, não `text-white/85`: a mistura a 85%
            sobre o verde cai para 4,19:1 e reprova em AA. */}
        <span className={`text-sm leading-snug ${tone === "accent" ? "text-muted" : "text-white"}`}>{desc}</span>
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
  // workspace, v1) — o que importa aqui é a agenda de curto prazo, quanto
  // está pendente de resposta, faturamento e um gráfico dos últimos meses.
  let agendaCurta: { id: string; data: string; hora_inicio: string; hora_fim: string; descricao: string | null; status: string }[] = [];
  let tituloAgendaCurta = "Hoje";
  let pendentesCount = 0;
  let faturamentoMes = 0;
  let totalRealizados = 0;
  let mesesFaturamento: MesFaturamento[] = [];
  let perfilIncompleto: string[] = [];
  if (user!.role === "prestador_servico") {
    const { data: slotsHoje } = await sb
      .from("agenda_slots")
      .select("id, data, hora_inicio, hora_fim, status")
      .eq("prestador_id", user!.id)
      .eq("data", hojeStr)
      .order("hora_inicio", { ascending: true });

    // Sem nada hoje, a home não pode virar beco sem saída — mostra os
    // próximos horários futuros (até 5) em vez de só "nada hoje".
    let slotsAgenda = slotsHoje ?? [];
    if (slotsAgenda.length === 0) {
      tituloAgendaCurta = "Próximos horários";
      const { data: proximos } = await sb
        .from("agenda_slots")
        .select("id, data, hora_inicio, hora_fim, status")
        .eq("prestador_id", user!.id)
        .gt("data", hojeStr)
        .order("data", { ascending: true })
        .order("hora_inicio", { ascending: true })
        .limit(5);
      slotsAgenda = proximos ?? [];
    }
    const idsAgenda = slotsAgenda.map((s) => s.id);
    const { data: servicosAgenda } = idsAgenda.length
      ? await sb.from("servicos").select("slot_id, descricao, status").in("slot_id", idsAgenda)
      : { data: [] };
    const servicoPorSlot = new Map((servicosAgenda ?? []).map((s) => [s.slot_id, s]));
    agendaCurta = slotsAgenda.map((s) => {
      const serv = servicoPorSlot.get(s.id);
      return { id: s.id, data: s.data, hora_inicio: s.hora_inicio, hora_fim: s.hora_fim, descricao: serv?.descricao ?? null, status: serv?.status ?? s.status };
    });

    const { count } = await sb
      .from("servicos")
      .select("id", { count: "exact", head: true })
      .eq("prestador_id", user!.id)
      .eq("status", "pendente");
    pendentesCount = count ?? 0;

    // Últimos 6 meses (incluindo o atual) pro gráfico — junta slot (pela data
    // real do serviço) com o valor/cliente de cada serviço realizado nesse período.
    const inicioJanela = new Date();
    inicioJanela.setDate(1);
    inicioJanela.setMonth(inicioJanela.getMonth() - 5);
    const inicioJanelaStr = inicioJanela.toLocaleDateString("sv-SE");
    const { data: slotsJanela } = await sb
      .from("agenda_slots")
      .select("id, data")
      .eq("prestador_id", user!.id)
      .gte("data", inicioJanelaStr)
      .lte("data", hojeStr);
    const dataPorSlot = new Map((slotsJanela ?? []).map((s) => [s.id, s.data]));
    const idsJanela = (slotsJanela ?? []).map((s) => s.id);
    const { data: realizadosJanela } = idsJanela.length
      ? await sb.from("servicos").select("slot_id, preco_valor, cliente_id").in("slot_id", idsJanela).eq("status", "realizado")
      : { data: [] };

    const porMes = new Map<string, { faturamento: number; servicos: number; clientes: Set<string> }>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(inicioJanela);
      d.setMonth(d.getMonth() + i);
      porMes.set(d.toLocaleDateString("sv-SE").slice(0, 7), { faturamento: 0, servicos: 0, clientes: new Set() });
    }
    for (const s of realizadosJanela ?? []) {
      const data = dataPorSlot.get(s.slot_id);
      if (!data) continue;
      const chave = data.slice(0, 7);
      const acc = porMes.get(chave);
      if (!acc) continue;
      acc.faturamento += s.preco_valor;
      acc.servicos += 1;
      acc.clientes.add(s.cliente_id);
    }
    const NOME_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    mesesFaturamento = [...porMes.entries()].map(([chave, v]) => ({
      mes: chave,
      rotulo: NOME_MES[Number(chave.slice(5, 7)) - 1]!,
      faturamento: v.faturamento,
      numServicos: v.servicos,
      numClientes: v.clientes.size,
    }));
    faturamentoMes = mesesFaturamento[mesesFaturamento.length - 1]?.faturamento ?? 0;

    const { count: countRealizados } = await sb
      .from("servicos")
      .select("id", { count: "exact", head: true })
      .eq("prestador_id", user!.id)
      .eq("status", "realizado");
    totalRealizados = countRealizados ?? 0;

    // Nudge de perfil incompleto — o que falta preencher, na ordem que mais afeta ser encontrado/contratado.
    const { data: meuPerfilCompleto } = await sb
      .from("profiles")
      .select("bio, foto_url, categoria, preco_valor")
      .eq("user_id", user!.id)
      .maybeSingle();
    const { data: minhaPiiCompleta } = await sb.from("profiles_pii").select("chave_pix").eq("user_id", user!.id).maybeSingle();
    if (!meuPerfilCompleto?.foto_url) perfilIncompleto.push("foto");
    if (!meuPerfilCompleto?.bio) perfilIncompleto.push("descrição");
    if (!meuPerfilCompleto?.categoria) perfilIncompleto.push("categoria");
    if (meuPerfilCompleto?.preco_valor == null) perfilIncompleto.push("preço");
    if (!minhaPiiCompleta?.chave_pix) perfilIncompleto.push("chave Pix");
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
    // Início é painel, não formulário (direção e): usa o teto de 1100px da
    // casca por inteiro, em vez de se estreitar como uma página de formulário
    // faria — a largura é uma decisão desta página, não um acidente do layout.
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
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
                desc="Publique uma vaga e receba candidatos para reforçar a equipe."
                tone="accent"
                icone="🛠️"
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
              icone="🔍"
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
        <>
          {perfilIncompleto.length > 0 ? (
            <Link
              href="/perfil/editar"
              className="flex items-center justify-between gap-3 rounded-2xl border border-brand bg-tint-info px-4 py-3 text-sm transition hover:brightness-95"
            >
              <span>
                <span className="font-semibold text-brand">Complete seu perfil</span>{" "}
                <span className="text-muted">— falta {perfilIncompleto.join(", ")}. Perfil completo aparece mais nas buscas.</span>
              </span>
              <span className="shrink-0 font-semibold text-brand">Editar →</span>
            </Link>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="card flex flex-col items-center gap-0.5 py-3 text-center">
              <p className="text-xl font-bold text-brand">{agendaCurta.length}</p>
              <p className="text-xs text-muted">{tituloAgendaCurta === "Hoje" ? "hoje" : "próximos"}</p>
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
            <Link href={`/perfil/${user!.id}`} className="card flex flex-col items-center gap-0.5 py-3 text-center transition hover:border-brand">
              <p className="text-xl font-bold text-brand">{totalRealizados}</p>
              <p className="text-xs text-muted">realizados (total)</p>
            </Link>
          </div>

          <GraficoFaturamento meses={mesesFaturamento} />
        </>
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
                      <span className={`inline-block rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${STATUS_ESTILO[s.status] ?? "bg-surface text-muted"}`}>
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
            <h2 className="text-sm font-semibold text-muted">{tituloAgendaCurta}</h2>
            <Link href="/agenda" className="text-sm font-semibold text-brand">
              Ver agenda →
            </Link>
          </div>
          {agendaCurta.length === 0 ? (
            <p className="card-vazio">Nenhum horário aberto — abra um período na agenda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {agendaCurta.map((s) => (
                <Link
                  key={s.id}
                  href={`/agenda/${s.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line bg-card px-3 py-2.5 transition hover:border-brand"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted">
                      {tituloAgendaCurta !== "Hoje" ? `${formatData(s.data)} · ` : ""}
                      {formatHora(s.hora_inicio)}–{formatHora(s.hora_fim)}
                    </p>
                    <p className="truncate text-sm font-semibold">{s.descricao ?? "Horário livre"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-rotulo font-semibold uppercase tracking-wide ${STATUS_ESTILO[s.status] ?? "bg-surface text-muted"}`}>
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
