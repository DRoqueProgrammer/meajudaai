import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { TelaComHeader, Avatar, StarRating, Verificado } from "@/components/ui";
import { logoutAction } from "@/lib/actions/auth";
import { Denunciar } from "@/components/denunciar";
import { TrocarPapel } from "@/components/trocar-papel";
import { formatData } from "@/lib/format";
import { nomeCategoria } from "@/lib/categorias";

const PAPEL_LABEL: Record<string, string> = {
  sysadmin: "Administração da plataforma",
  admin: "Profissional",
  funcionario: "Funcionário",
  ajudante: "Ajudante",
};

/** Rota `/perfil/[id]`: perfil público (nota, bio, disponibilidade e avaliações) de um usuário. */
export default async function PerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const sb = await createServerClient();
  // Colunas explícitas em vez de `*`: esta tela é pública para qualquer usuário
  // logado, e `profiles` guarda mais do que ela precisa mostrar.
  const { data: p } = await sb
    .from("profiles")
    .select("nome, foto_url, bio, disponibilidade, cidade, estado, tipo_base, nota_media, total_avaliacoes, verificado, created_at")
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

  const desde = new Date(p.created_at).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

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
            </div>
            <p className="text-sm text-muted">{PAPEL_LABEL[p.tipo_base] ?? p.tipo_base}</p>
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

        {/* Histórico de trabalho — o que responde "posso confiar?" para quem
            ainda não tem avaliação nenhuma. */}
        <div className="card flex flex-col gap-3">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div>
              <p className="text-xl font-bold text-brand">{concluidas.length}</p>
              <p className="text-xs text-muted">
                {concluidas.length === 1 ? "diária concluída" : "diárias concluídas"}
              </p>
            </div>
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
          ) : concluidas.length === 0 && p.total_avaliacoes === 0 ? (
            <p className="border-t border-line pt-3 text-sm leading-relaxed text-muted">
              Ainda não fechou nenhuma diária por aqui. Todo mundo começa assim — quem der a
              primeira chance é que constrói a reputação dessa pessoa.
            </p>
          ) : null}
        </div>

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
            {p.tipo_base === "admin" || p.tipo_base === "ajudante" ? (
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
