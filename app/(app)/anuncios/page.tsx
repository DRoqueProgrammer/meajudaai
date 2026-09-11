import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { AnuncioForm } from "@/components/anuncio-form";
import { AnuncioStatusBotoes } from "@/components/anuncio-status-botoes";
import { StatusBadge } from "@/components/ui";
import { nomeCategoria } from "@/lib/categorias";
import { formatData } from "@/lib/format";

/**
 * Rota `/anuncios` ("Meus anúncios", só Prestador de Serviço — outros papéis
 * voltam para `/inicio`): publica até X anúncios ATIVOS — oferta do próprio
 * serviço ou vaga para ajudante sem conta — e administra os que já existem
 * (pausar, reativar, encerrar). O X vem de `limite_de_anuncios` (migration
 * 0044): o ajuste do Administrador por prestador, senão o padrão da praça da
 * cidade dele, senão 3 (padrão da plataforma) — nunca decidido por aqui.
 */
export default async function AnunciosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "prestador_servico") redirect("/inicio");

  const sb = await createServerClient();
  const [{ data: perfil }, { data: pii }, { data: limite }, { data: anuncios }] = await Promise.all([
    sb.from("profiles").select("categoria").eq("user_id", user.id).maybeSingle(),
    sb.from("profiles_pii").select("telefone").eq("user_id", user.id).maybeSingle(),
    sb.rpc("limite_de_anuncios", { p_prestador: user.id }),
    sb
      .from("anuncios")
      .select("id, tipo, titulo, descricao, categoria, whatsapp, status, created_at")
      .eq("prestador_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const limiteNum = limite ?? 3;
  const ativos = (anuncios ?? []).filter((a) => a.status === "ativo").length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Meus anúncios</h1>
        <p className="mt-1 text-sm text-muted">
          <strong className="font-semibold text-ink">
            {ativos} de {limiteNum}
          </strong>{" "}
          anúncios ativos. Quem define esse limite é o Administrador da sua praça.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="lg:w-[380px] lg:shrink-0">
          <AnuncioForm categoriaPerfil={perfil?.categoria ?? null} telefonePerfil={pii?.telefone ?? null} />
        </div>

        <div className="flex flex-1 flex-col gap-2">
          {(anuncios ?? []).length === 0 ? (
            <p className="card-vazio">
              Você ainda não publicou nenhum anúncio. Use o formulário para oferecer seu serviço ou
              abrir uma vaga para ajudante.
            </p>
          ) : (
            (anuncios ?? []).map((a) => (
              <div key={a.id} className="card flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={a.status} />
                    <span className="text-xs font-medium text-muted">
                      {a.tipo === "vaga_ajudante" ? "Necessita-se ajudante!" : "Oferta de serviço"}
                    </span>
                  </div>
                  <span className="text-xs text-muted">{formatData((a.created_at ?? "").slice(0, 10))}</span>
                </div>
                <p className="text-sm font-semibold">{a.titulo}</p>
                <p className="line-clamp-2 text-sm text-muted">{a.descricao}</p>
                {a.categoria ? (
                  <span className="inline-flex w-fit items-center rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink">
                    {nomeCategoria(a.categoria)}
                  </span>
                ) : null}

                {a.status === "moderado" ? (
                  <p className="text-xs leading-relaxed text-danger">
                    Este anúncio foi tirado do ar pela moderação. Fale com o Administrador da sua praça.
                  </p>
                ) : (
                  <AnuncioStatusBotoes anuncioId={a.id} status={a.status} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
