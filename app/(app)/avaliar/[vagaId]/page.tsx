import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { TelaComHeader } from "@/components/ui";
import { AvaliarForm } from "@/components/avaliar-form";
import Link from "next/link";
import { formatBRL, formatData } from "@/lib/format";
import { jaPassou } from "@/lib/periodo";

export default async function AvaliarPage({ params }: { params: Promise<{ vagaId: string }> }) {
  const { vagaId } = await params;
  const user = await getCurrentUser();
  const sb = await createServerClient();

  const { data: vaga } = await sb
    .from("vagas")
    .select("id, criado_por, titulo, data_servico, valor_diaria, status")
    .eq("id", vagaId)
    .maybeSingle();
  if (!vaga) notFound();

  const { data: aceita } = await sb
    .from("candidaturas")
    .select("ajudante_id")
    .eq("vaga_id", vagaId)
    .eq("status", "aceito")
    .maybeSingle();

  const ajudanteId = aceita?.ajudante_id ?? null;
  const avaliadoId = user!.id === vaga.criado_por ? ajudanteId : vaga.criado_por;
  if (!avaliadoId) notFound();

  const { data: perfil } = await sb.from("profiles").select("nome").eq("user_id", avaliadoId).maybeSingle();

  // Avaliar antes do serviço contamina a média — e nota é a única moeda do
  // produto. A vaga tinha "Avaliar" disponível assim que a candidatura era
  // aceita, às vezes uma semana antes de alguém pisar na obra.
  const aindaNaoAconteceu = !jaPassou(vaga.data_servico);

  if (aindaNaoAconteceu) {
    return (
      <TelaComHeader titulo="Avaliar experiência" voltar="/minhas-diarias">
        <div className="card-vazio">
          <p className="text-sm text-muted">
            A diária de <strong className="font-medium text-ink">{vaga.titulo}</strong> é dia{" "}
            {formatData(vaga.data_servico)}. Você poderá avaliar{" "}
            {perfil?.nome ? <strong className="font-medium text-ink">{perfil.nome}</strong> : "a pessoa"}{" "}
            depois do serviço.
          </p>
          <Link href={`/chat/vaga/${vagaId}`} className="btn-ghost mt-4">
            Combinar pelo chat
          </Link>
        </div>
      </TelaComHeader>
    );
  }

  return (
    <TelaComHeader titulo="Avaliar experiência" voltar="/minhas-diarias">
      {/* Sem isto o usuário avaliava sem saber qual diária — duas com a mesma
          pessoa eram indistinguíveis. */}
      <p className="mb-3 text-sm text-muted">
        {vaga.titulo} · {formatData(vaga.data_servico)} · {formatBRL(vaga.valor_diaria)}
      </p>
      <AvaliarForm vagaId={vagaId} avaliadoId={avaliadoId} nomeOutro={perfil?.nome ?? "a pessoa"} />
    </TelaComHeader>
  );
}
