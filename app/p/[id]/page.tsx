import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/roles";
import { nomeCategoria } from "@/lib/categorias";
import { formatBRL, formatData, formatHora } from "@/lib/format";
import { waLinkVaga } from "@/lib/whatsapp";
import { Avatar, StarRating, Verificado } from "@/components/ui";
import { Logo } from "@/components/logo";
import { Footer } from "@/components/footer";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Perfil público de um prestador, lido só por `perfil_publico_prestador`
 * (migration 0049) — nunca telefone, e-mail, endereço nem ponto exato.
 * `cache()` do React deduplica a chamada entre `generateMetadata` e a
 * página: as duas rodam na mesma requisição (mesmo padrão de
 * `lib/auth/roles.ts:getCurrentUser`).
 */
const buscarPerfilPublico = cache(async (id: string) => {
  const sb = await createServerClient();
  const { data } = await sb.rpc("perfil_publico_prestador", { p_id: id });
  return data?.[0] ?? null;
});

/** Primeiro nome, pro CTA ("Agendar com Ana") e pro título — nunca o nome completo, que já aparece no cabeçalho. */
function primeiroNome(nomeCompleto: string): string {
  return nomeCompleto.trim().split(/\s+/)[0] ?? nomeCompleto;
}

/** Rótulo do tipo de cobrança — os únicos dois valores de `profiles.preco_tipo` (ver components/perfil-form.tsx). */
function rotuloCobranca(precoTipo: string | null): string {
  return precoTipo === "hora" ? "/hora" : "por serviço (fechado)";
}

/** Agrupa por `data` (ISO `YYYY-MM-DD`), preservando a ordem de chegada — os horários já vêm ordenados pela RPC. */
function agruparPorDia<T extends { data: string }>(itens: T[]): { data: string; itens: T[] }[] {
  const porData = new Map<string, T[]>();
  for (const item of itens) {
    const grupo = porData.get(item.data);
    if (grupo) grupo.push(item);
    else porData.set(item.data, [item]);
  }
  return [...porData.entries()].map(([data, itens]) => ({ data, itens }));
}

/** Rótulo curto de dia pra agrupar os chips de horário: "Seg, 15/09" (monta a partir das partes da data ISO, sem shift de fuso). */
function labelDiaCurto(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return iso;
  const data = new Date(ano, mes - 1, dia);
  const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(/\.$/, "");
  const capitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  return `${capitalizado}, ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}

/**
 * Título, descrição e Open Graph próprios da vitrine (a landing só tem a
 * imagem genérica de `app/opengraph-image.tsx`) — colar o link do perfil num
 * grupo do bairro precisa chegar com o nome, a categoria e a foto do
 * prestador, não com o cartão genérico do app.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const perfil = await buscarPerfilPublico(id);
  if (!perfil) notFound();

  const categoriaTxt = perfil.categoria ? nomeCategoria(perfil.categoria) : "prestador de serviço";
  const local = perfil.cidade ? ` em ${perfil.cidade}` : "";
  const titulo = `${perfil.nome} — ${categoriaTxt}${local} | Me Ajuda Aí`;
  const descricao = perfil.bio
    ? perfil.bio.slice(0, 155)
    : `Veja o perfil de ${perfil.nome}, ${categoriaTxt}${local}, e agende um horário direto pelo Me Ajuda Aí — sem grupo de WhatsApp, sem esperar candidatura.`;

  return {
    title: { absolute: titulo },
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      type: "profile",
      images: perfil.foto_url
        ? [{ url: perfil.foto_url }]
        : [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Me Ajuda Aí" }],
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
      images: [perfil.foto_url ?? "/opengraph-image"],
    },
  };
}

/**
 * Rota pública `/p/[id]` (fora do grupo `(app)`, sem exigir sessão): vitrine
 * de um prestador — quem não tem conta decide se cadastra depois de ver o
 * perfil, os anúncios, os próximos horários livres e as avaliações. Antes
 * disso, o "Ver agenda" da vitrine da página inicial caía direto no
 * cadastro, sem mostrar nada do prestador (Fatia 5 da vistoria de
 * 10/09/2026). Lê só pelas quatro funções públicas SECURITY DEFINER da
 * migration 0049/0044 — nunca a chave de serviço.
 */
export default async function PaginaPublicaPrestador({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, perfil] = await Promise.all([getCurrentUser(), buscarPerfilPublico(id)]);
  if (!perfil) notFound();

  const sb = await createServerClient();
  const [{ data: anuncios }, { data: horarios }, { data: avaliacoes }] = await Promise.all([
    sb.rpc("anuncios_publicos", { p_prestador: id, p_limite: 24 }),
    sb.rpc("horarios_livres_publicos", { p_prestador: id, p_limite: 30 }),
    sb.rpc("avaliacoes_publicas", { p_prestador: id, p_limite: 10 }),
  ]);

  const nome = primeiroNome(perfil.nome);
  const categoriaTxt = perfil.categoria ? nomeCategoria(perfil.categoria) : "Categoria não informada";
  const localTxt = perfil.cidade ? `${perfil.cidade}${perfil.estado ? `, ${perfil.estado}` : ""}` : null;
  // Logado, o CTA vai direto pra agenda (mesma rota que a busca e o mural já
  // usam); sem sessão, passa pelo login com volta marcada pra ela.
  const hrefAgendar = user ? `/prestador/${id}` : `/login?next=/prestador/${id}`;
  const gruposHorarios = agruparPorDia(horarios ?? []);

  return (
    <div className="flex min-h-dvh flex-col bg-surface pb-20 tabular-nums text-ink lg:pb-0">
      {/* Cabeçalho coerente com a landing (app/page.tsx): mesma logo, mesmo
          alternador de tema e os mesmos dois links de entrada. */}
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-line bg-card/90 px-4 backdrop-blur md:gap-6 md:px-8">
        <Link
          href="/"
          aria-label="Início do Me Ajuda Aí"
          className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Logo />
        </Link>
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
        <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8 md:py-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
            {/* Coluna principal --------------------------------------------------- */}
            <div className="flex flex-col gap-6">
              <div className="card flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar nome={perfil.nome} fotoUrl={perfil.foto_url} tamanho="xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-[-0.01em]">{perfil.nome}</h1>
                    {perfil.verificado ? <Verificado /> : null}
                    {perfil.exemplo ? (
                      <span className="shrink-0 rounded-full bg-tint-neutral px-2 py-0.5 text-xs font-medium text-muted">
                        Exemplo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {categoriaTxt}
                    {localTxt ? ` · ${localTxt}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StarRating nota={perfil.nota_media} total={perfil.total_avaliacoes} />
                    <span className="text-sm text-muted">
                      {perfil.servicos_realizados}{" "}
                      {perfil.servicos_realizados === 1 ? "serviço realizado" : "serviços realizados"}
                    </span>
                  </div>
                  {perfil.preco_valor != null ? (
                    <p className="mt-3 text-xl font-bold text-brand">
                      {formatBRL(perfil.preco_valor)}{" "}
                      <span className="text-sm font-normal text-muted">{rotuloCobranca(perfil.preco_tipo)}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {perfil.bio || perfil.disponibilidade ? (
                <div className="card flex flex-col gap-4">
                  {perfil.bio ? (
                    <div>
                      <h2 className="mb-1 text-sm font-semibold text-muted">Sobre</h2>
                      <p className="whitespace-pre-line text-sm leading-relaxed">{perfil.bio}</p>
                    </div>
                  ) : null}
                  {perfil.disponibilidade ? (
                    <div className={perfil.bio ? "border-t border-line pt-3" : ""}>
                      <h2 className="mb-1 text-sm font-semibold text-muted">Disponibilidade</h2>
                      <p className="text-sm text-muted">{perfil.disponibilidade}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <section>
                <h2 className="mb-3 text-lg font-bold tracking-[-0.01em]">Anúncios</h2>
                {(anuncios ?? []).length === 0 ? (
                  <p className="card-vazio">Nenhum anúncio publicado no momento.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(anuncios ?? []).map((a) =>
                      a.tipo === "vaga_ajudante" ? (
                        <div key={a.id} className="card flex flex-col gap-3">
                          <span className="inline-flex w-fit items-center rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-[#3a2f00]">
                            Necessita-se ajudante!
                          </span>
                          <div>
                            <p className="text-base font-semibold leading-tight">{a.titulo}</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted">{a.descricao}</p>
                          </div>
                          {a.whatsapp ? (
                            <a
                              href={waLinkVaga(a.whatsapp, a.titulo)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-action mt-auto w-full"
                            >
                              Chamar no WhatsApp
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <div key={a.id} className="card flex flex-col gap-2">
                          <p className="text-base font-semibold leading-tight">{a.titulo}</p>
                          <p className="text-sm leading-relaxed text-muted">{a.descricao}</p>
                          {a.categoria ? (
                            <span className="mt-auto inline-flex w-fit items-center rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-ink">
                              {nomeCategoria(a.categoria)}
                            </span>
                          ) : null}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </section>

              <section>
                <h2 className="mb-3 text-lg font-bold tracking-[-0.01em]">Próximos horários livres</h2>
                {gruposHorarios.length === 0 ? (
                  <p className="card-vazio">Nenhum horário livre no momento — volte mais tarde.</p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {gruposHorarios.map((grupo) => (
                        <div key={grupo.data} className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3">
                          <p className="text-rotulo font-semibold uppercase tracking-wide text-muted">
                            {labelDiaCurto(grupo.data)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {grupo.itens.map((h) => (
                              // Chave inclui hora_fim: dois horários livres podem começar na
                              // mesma hora com fins diferentes (janelas que se sobrepõem).
                              <span
                                key={`${h.data}-${h.hora_inicio}-${h.hora_fim}`}
                                className="chip chip-off cursor-default"
                              >
                                {formatHora(h.hora_inicio)}–{formatHora(h.hora_fim)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-muted">
                      Só leitura — pra reservar um horário, entre ou crie sua conta grátis.
                    </p>
                  </>
                )}
              </section>

              <section>
                <h2 className="mb-3 text-lg font-bold tracking-[-0.01em]">
                  Avaliações{perfil.total_avaliacoes ? ` (${perfil.total_avaliacoes})` : ""}
                </h2>
                {(avaliacoes ?? []).length === 0 ? (
                  <p className="card-vazio">Ainda sem avaliações.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {(avaliacoes ?? []).map((av, i) => (
                      <div key={i} className="card flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{av.avaliador_primeiro_nome ?? "Cliente"}</span>
                          <StarRating nota={av.nota} />
                        </div>
                        {av.comentario ? (
                          <p className="text-sm leading-relaxed text-muted">{av.comentario}</p>
                        ) : null}
                        <p className="text-xs text-muted">{formatData((av.created_at ?? "").slice(0, 10))}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar de agendamento (desktop): fica visível sem sair da
                tela enquanto rola o conteúdo principal — no mobile o mesmo
                par de botões vive na barra fixa abaixo. */}
            <aside className="hidden lg:sticky lg:top-[96px] lg:block">
              <div className="card flex flex-col gap-4">
                {perfil.preco_valor != null ? (
                  <div>
                    <p className="text-xl font-bold text-brand">
                      {formatBRL(perfil.preco_valor)}{" "}
                      <span className="text-sm font-normal text-muted">{rotuloCobranca(perfil.preco_tipo)}</span>
                    </p>
                  </div>
                ) : null}
                <Link href={hrefAgendar} className="btn-brand w-full">
                  Agendar com {nome}
                </Link>
                {!user ? (
                  <Link href="/cadastro" className="btn-ghost w-full">
                    Criar conta grátis
                  </Link>
                ) : null}
                <p className="text-xs text-muted">
                  O contato só aparece depois do agendamento confirmado.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* CTA fixo no mobile — a sidebar acima só aparece a partir do `lg`. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-line bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <Link href={hrefAgendar} className="btn-brand flex-1">
          Agendar com {nome}
        </Link>
        {!user ? (
          <Link href="/cadastro" className="btn-ghost flex-1">
            Criar conta grátis
          </Link>
        ) : null}
      </div>

      <Footer />
    </div>
  );
}
