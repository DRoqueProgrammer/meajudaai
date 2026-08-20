import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { guardModule } from "@/lib/auth/modules";
import { TelaComHeader, Avatar, StarRating } from "@/components/ui";
import { ResponderCandidatura } from "@/components/responder-candidatura";
import { CancelarVaga } from "@/components/cancelar-vaga";
import { ConcluirDiaria } from "@/components/concluir-diaria";
import { jaPassou } from "@/lib/periodo";

/** Rota `/minhas-vagas/[id]/candidatos`: candidatos de uma vaga, para o gestor aceitar ou recusar. */
export default async function CandidatosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await guardModule("vagas");
  const sb = await createServerClient();

  const { data: vaga } = await sb
    .from("vagas")
    .select("id, titulo, status, data_servico, valor_diaria")
    .eq("id", id)
    .maybeSingle();
  if (!vaga) notFound();

  const { data: cands } = await sb
    .from("candidaturas")
    .select("id, ajudante_id, status, created_at")
    .eq("vaga_id", id)
    .order("created_at", { ascending: true });

  const ajudanteIds = (cands ?? []).map((c) => c.ajudante_id);
  const { data: perfis } = ajudanteIds.length
    ? await sb.from("profiles").select("user_id, nome, foto_url, nota_media, total_avaliacoes").in("user_id", ajudanteIds)
    : { data: [] };
  const perfilDe = new Map((perfis ?? []).map((p) => [p.user_id, p]));

  const servicoJaAconteceu = jaPassou(vaga.data_servico);

  return (
    <TelaComHeader titulo="Candidatos" voltar="/minhas-vagas">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium">{vaga.titulo}</p>
          <p className="text-xs text-muted">
            {(cands ?? []).length} candidato{(cands ?? []).length === 1 ? "" : "s"} · ordenados por chegada
          </p>
        </div>
        {(cands ?? []).map((c) => {
          const p = perfilDe.get(c.ajudante_id);
          return (
            <div key={c.id} className="card flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar nome={p?.nome ?? "?"} fotoUrl={p?.foto_url} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{p?.nome ?? "Ajudante"}</p>
                  <StarRating nota={p?.nota_media ?? 0} total={p?.total_avaliacoes ?? 0} />
                </div>
                <Link href={`/perfil/${c.ajudante_id}`} className="text-xs font-semibold text-brand">
                  Ver perfil
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <ResponderCandidatura
                  candidaturaId={c.id}
                  status={c.status}
                  nome={p?.nome ?? "este ajudante"}
                  dataServico={vaga.data_servico}
                  valorDiaria={vaga.valor_diaria}
                />
                {c.status === "aceito" ? (
                  <span className="flex flex-wrap gap-3">
                    <Link href={`/chat/vaga/${vaga.id}`} className="btn-ghost px-4 text-xs">
                      Chat
                    </Link>
                    {/* "Avaliar" só depois do serviço — antes disso a nota sai
                        de um trabalho que ainda não existiu. */}
                    {servicoJaAconteceu ? (
                      <Link href={`/avaliar/${vaga.id}`} className="btn-action px-4 text-xs">
                        Avaliar
                      </Link>
                    ) : null}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
        {(!cands || cands.length === 0) && (
          <p className="card-vazio">
            Ainda não há candidatos nesta vaga.
          </p>
        )}
        {vaga.status === "aberta" ? (
          <div className="mt-2 flex flex-col gap-3 border-t border-line pt-4">
            <Link href={`/minhas-vagas/${vaga.id}/editar`} className="btn-ghost">
              Editar diária
            </Link>
            <CancelarVaga vagaId={vaga.id} candidatos={(cands ?? []).length} />
          </div>
        ) : null}

        {vaga.status === "em_andamento" ? (
          <div className="mt-2 border-t border-line pt-4">
            <ConcluirDiaria
              vagaId={vaga.id}
              ajudante={
                perfilDe.get((cands ?? []).find((c) => c.status === "aceito")?.ajudante_id ?? "")?.nome ??
                null
              }
              jaPassou={servicoJaAconteceu}
            />
          </div>
        ) : null}

        {vaga.status === "finalizada" ? (
          <div className="mt-2 border-t border-line pt-4">
            <p className="text-sm text-muted">Diária concluída. A avaliação está liberada.</p>
          </div>
        ) : null}
      </div>
    </TelaComHeader>
  );
}
