import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, type AppRole } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { TelaComHeader, Avatar, StarRating, Verificado } from "@/components/ui";
import { logoutAction } from "@/lib/actions/auth";
import { Denunciar } from "@/components/denunciar";
import { TrocarPapel } from "@/components/trocar-papel";
import { formatData } from "@/lib/format";
import { nomeCategoria } from "@/lib/categorias";
import { papelLabel } from "@/lib/papel-label";
import { LocalMapa } from "@/components/maps/local-mapa-dynamic";
import { CompartilharLocal } from "@/components/maps/compartilhar-local";
import { FlagsPessoa } from "@/components/flags-pessoa";
import { waLink } from "@/lib/whatsapp";
import { ChavesPix } from "@/components/pix/chaves-pix";

/** Rota `/perfil/[id]`: perfil público (nota, bio, disponibilidade e avaliações) de um usuário. */
export default async function PerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const sb = await createServerClient();
  // Colunas explícitas em vez de `*`: esta tela é pública para qualquer usuário
  // logado, e `profiles` guarda mais do que ela precisa mostrar.
  const { data: p } = await sb
    .from("profiles")
    .select("nome, foto_url, bio, disponibilidade, cidade, estado, tipo_base, genero, nota_media, total_avaliacoes, verificado, created_at, servicos_realizados")
    .eq("user_id", id)
    .maybeSingle();
  if (!p) notFound();

  const ehEu = user!.id === id;

  // A decisão que acontece nesta tela é "deixo esse desconhecido entrar na minha
  // obra amanhã". Estrelas e cidade não sustentam isso — e para quem não tem
  // avaliação ainda, não sustentam nada. Histórico de trabalho é o sinal que
  // dá para derivar hoje, sem campo novo: quantas diárias a pessoa concluiu e
  // em que tipos de serviço.
  const { data: aceitas } = await sb
    .from("candidaturas")
    .select("vaga_id, vagas(status, categoria)")
    .eq("ajudante_id", id)
    .eq("status", "aceito");

  const concluidas = (aceitas ?? []).filter((c) => {
    const v = c.vagas as unknown as { status: string } | null;
    return v?.status === "finalizada";
  });
  const categorias = [
    ...new Set(
      concluidas
        .map((c) => (c.vagas as unknown as { categoria: string } | null)?.categoria)
        .filter((x): x is string => !!x),
    ),
  ].slice(0, 4);

  // Modelo v2: o contador que importa pro prestador é serviços realizados
  // (não diárias/candidaturas, que são do fluxo antigo). Vem de
  // profiles.servicos_realizados (denormalizado — ver migration 0035) porque
  // `servicos` tem RLS restrita às partes envolvidas; um cliente que nunca
  // contratou esse prestador precisa ver o total real, não zero.
  const ehPrestadorV2 = p.tipo_base === "prestador_servico";

  // Endereço + PIN exato (profile_local): cliente, prestador_servico e
  // Administrador (o endereço da empresa) têm. A RLS (migration 0023/0036/0039) decide sozinha quem lê essa linha — o
  // próprio dono, sysadmin, ou a outra parte de um serviço válido
  // (tem_servico_com) — com o client da sessão, sem checagem extra aqui: se
  // não vier linha, o card simplesmente não aparece (nunca "sem permissão").
  const mostrarLocalizacao = p.tipo_base === "cliente" || ehPrestadorV2 || p.tipo_base === "admin";
  const { data: local } = mostrarLocalizacao
    ? await sb.from("profile_local").select("endereco, lat, lng").eq("user_id", id).maybeSingle()
    : { data: null };

  const desde = new Date(p.created_at).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  // Anúncios ativos do prestador (migration 0044) — leitura pública, sempre
  // por `anuncios_publicos`, que nunca devolve telefone do perfil nem e-mail
  // (só o WhatsApp que o próprio prestador escolheu expor NAQUELA vaga).
  const { data: anuncios } = ehPrestadorV2
    ? await sb.rpc("anuncios_publicos", { p_prestador: id })
    : { data: null };

  // Minhas chaves Pix (migration 0056) — no PRÓPRIO perfil, do prestador (cobra
  // o cliente), do Administrador e do SysAdmin (a chave PADRÃO do Administrador
  // é pra onde vai a comissão da praça — D-044/lote C). A RLS só entrega as do
  // dono, mas a lista só faz sentido nesses três papéis.
  const podeTerChavesPix = ehPrestadorV2 || p.tipo_base === "admin" || p.tipo_base === "sysadmin";
  const { data: minhasChaves } =
    ehEu && podeTerChavesPix
      ? await sb.from("chaves_pix").select("id, apelido, chave, padrao").eq("user_id", id).order("created_at", { ascending: true })
      : { data: null };

  const { data: avals } = await sb
    .from("avaliacoes")
    .select("id, nota, comentario, created_at, avaliador_id")
    .eq("avaliado_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  const autorIds = [...new Set((avals ?? []).map((a) => a.avaliador_id))];
  const { data: autores } = autorIds.length
    ? await sb.from("profiles").select("user_id, nome").in("user_id", autorIds)
    : { data: [] };
  const nomeAutor = new Map((autores ?? []).map((a) => [a.user_id, a.nome]));

  // Red flags aprovadas (migration 0055) — a função só
  // devolve linha pra quem é do outro lado (cliente↔prestador) ou da
  // administração; pra própria pessoa (ehEu), vem vazia.
  const { data: flags } = await sb.rpc("flags_da_pessoa", { p_alvo: id });

  return (
    <TelaComHeader titulo="Perfil" voltar="/inicio">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Avatar nome={p.nome} fotoUrl={p.foto_url} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-lg font-semibold">{p.nome}</p>
              {/* O selo sai de baixo do bloco e vem para o lado do nome: ele é
                  parte da identidade, não um detalhe de rodapé. */}
              {p.verificado ? <Verificado /> : null}
              <FlagsPessoa flags={flags ?? []} />
            </div>
            <p className="text-sm text-muted">{papelLabel(p.tipo_base as AppRole, p.genero)}</p>
            <div className="mt-1">
              <StarRating nota={p.nota_media} total={p.total_avaliacoes} />
            </div>
          </div>
        </div>

        {p.bio ? (
          <div>
            <h2 className="mb-1 text-sm font-semibold text-muted">Sobre</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed">{p.bio}</p>
          </div>
        ) : null}

        {p.disponibilidade ? (
          <p className="text-sm">
            <span className="font-medium">Disponibilidade:</span>{" "}
            <span className="text-muted">{p.disponibilidade}</span>
          </p>
        ) : null}

        {/* Card só aparece pra quem a RLS deixou ler profile_local (o próprio
            dono, ou a outra parte de um serviço válido) — "local" vem null
            pra qualquer outro caso, e o card some, sem mensagem de aviso. */}
        {local ? (
          <div className="card flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-muted">Endereço e localização</h2>
              {ehEu ? (
                <Link href="/perfil/editar" className="text-sm font-medium text-brand underline">
                  Alterar
                </Link>
              ) : null}
            </div>
            {local.endereco ? <p className="text-sm leading-relaxed">{local.endereco}</p> : null}
            <LocalMapa lat={local.lat} lng={local.lng} />
            <CompartilharLocal modo="perfil" lat={local.lat} lng={local.lng} />
          </div>
        ) : null}

        {minhasChaves ? (
          <div className="flex flex-col gap-2">
            {p.tipo_base === "admin" ? (
              <p className="text-sm text-muted">
                Chave padrão: é nela que os prestadores da sua praça pagam a comissão.
              </p>
            ) : null}
            <ChavesPix chaves={minhasChaves} nome={p.nome} cidade={p.cidade} />
          </div>
        ) : null}

        {/* Histórico de trabalho — o que responde "posso confiar?" para quem
            ainda não tem avaliação nenhuma. */}
        <div className="card flex flex-col gap-3">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {ehPrestadorV2 ? (
              <div>
                <p className="text-xl font-bold text-brand">{p.servicos_realizados}</p>
                <p className="text-xs text-muted">
                  {p.servicos_realizados === 1 ? "serviço realizado" : "serviços realizados"}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xl font-bold text-brand">{concluidas.length}</p>
                <p className="text-xs text-muted">
                  {concluidas.length === 1 ? "diária concluída" : "diárias concluídas"}
                </p>
              </div>
            )}
            <div>
              <p className="text-xl font-bold text-brand">{p.total_avaliacoes}</p>
              <p className="text-xs text-muted">
                {p.total_avaliacoes === 1 ? "avaliação" : "avaliações"}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">
                {p.cidade ?? "—"}
                {p.estado ? ` · ${p.estado}` : ""}
              </p>
              <p className="text-xs text-muted">no app desde {desde}</p>
            </div>
          </div>

          {categorias.length > 0 ? (
            <div className="border-t border-line pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Já trabalhou em
              </p>
              <div className="flex flex-wrap gap-2">
                {categorias.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink"
                  >
                    {nomeCategoria(c)}
                  </span>
                ))}
              </div>
            </div>
          ) : !ehPrestadorV2 && concluidas.length === 0 && p.total_avaliacoes === 0 ? (
            <p className="border-t border-line pt-3 text-sm leading-relaxed text-muted">
              Ainda não fechou nenhuma diária por aqui. Todo mundo começa assim — quem der a
              primeira chance é que constrói a reputação dessa pessoa.
            </p>
          ) : null}
        </div>

        {ehPrestadorV2 ? (
          <div id="anuncios" className="scroll-mt-20">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-muted">Anúncios</h2>
              {ehEu ? (
                <Link href="/anuncios" className="text-sm font-medium text-brand underline">
                  Gerenciar anúncios
                </Link>
              ) : null}
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {(anuncios ?? []).length === 0 ? (
                ehEu ? (
                  <p className="card-vazio">
                    Você ainda não tem anúncio ativo. Publique um em &quot;Gerenciar anúncios&quot;.
                  </p>
                ) : null
              ) : (
                (anuncios ?? []).map((an) =>
                  an.tipo === "vaga_ajudante" ? (
                    <div key={an.id} className="card flex flex-col gap-2">
                      <span className="inline-flex w-fit items-center rounded-full bg-tint-warn px-2.5 py-0.5 text-xs font-medium text-tint-warn-ink">
                        Necessita-se ajudante!
                      </span>
                      <p className="text-sm font-semibold">{an.titulo}</p>
                      <p className="text-sm leading-relaxed text-muted">{an.descricao}</p>
                      {an.whatsapp ? (
                        <a
                          href={`${waLink(an.whatsapp)}?text=${encodeURIComponent(`Olá! Vi sua vaga "${an.titulo}" no Me Ajuda Aí.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-brand w-fit"
                        >
                          Chamar no WhatsApp
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <div key={an.id} className="card flex flex-col gap-2">
                      <p className="text-sm font-semibold">{an.titulo}</p>
                      <p className="text-sm leading-relaxed text-muted">{an.descricao}</p>
                      {an.categoria ? (
                        <span className="inline-flex w-fit items-center rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-ink">
                          {nomeCategoria(an.categoria)}
                        </span>
                      ) : null}
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        ) : null}

        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted">
            Avaliações{p.total_avaliacoes ? ` (${p.total_avaliacoes})` : ""}
          </h2>
          <div className="flex flex-col gap-2">
            {(avals ?? []).map((a) => (
              <div key={a.id} className="card flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{nomeAutor.get(a.avaliador_id) ?? "Usuário"}</span>
                  <StarRating nota={a.nota} />
                </div>
                {a.comentario ? <p className="text-sm leading-relaxed text-muted">{a.comentario}</p> : null}
                <p className="text-xs text-muted">{formatData((a.created_at ?? "").slice(0, 10))}</p>
              </div>
            ))}
            {(!avals || avals.length === 0) && (
              <p className="card-vazio">Ainda sem avaliações.</p>
            )}
          </div>
        </div>

        {ehEu ? (
          <div className="flex flex-col gap-4 border-t border-line pt-4">
            <Link href="/perfil/editar" className="btn-ghost w-full">
              Editar perfil
            </Link>
            {p.tipo_base === "admin" || p.tipo_base === "prestador_servico" ? (
              <TrocarPapel papelAtual={p.tipo_base} />
            ) : null}
            <form action={logoutAction}>
              <button className="btn-ghost w-full">Sair da conta</button>
            </form>
          </div>
        ) : (
          <div className="border-t border-line pt-3">
            <Denunciar alvoTipo="usuario" alvoId={id} alvoNome={p.nome} />
          </div>
        )}
      </div>
    </TelaComHeader>
  );
}
