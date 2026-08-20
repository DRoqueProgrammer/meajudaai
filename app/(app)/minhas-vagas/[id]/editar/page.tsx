import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { guardModule } from "@/lib/auth/modules";
import { TelaComHeader } from "@/components/ui";
import { PublicarForm } from "@/components/publicar-form";
import { editarVagaAction } from "@/lib/actions/vagas";

/** Rota `/minhas-vagas/[id]/editar`: edição de uma vaga ainda aberta. */
export default async function EditarVagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await guardModule("vagas");
  const sb = await createServerClient();

  const { data: vaga } = await sb
    .from("vagas")
    .select("id, status, titulo, categoria, descricao, cidade, bairro, data_servico, hora_inicio, valor_diaria, quantidade_vagas")
    .eq("id", id)
    .maybeSingle();
  if (!vaga) notFound();
  // Só vaga aberta é editável — depois de aceita ou finalizada, mudar o combinado
  // pelas costas de quem já está nela não faz sentido. Volta para a gestão da vaga.
  if (vaga.status !== "aberta") redirect(`/minhas-vagas/${id}/candidatos`);

  const iniciais: Record<string, string> = {
    titulo: vaga.titulo ?? "",
    categoria: vaga.categoria ?? "",
    descricao: vaga.descricao ?? "",
    cidade: vaga.cidade ?? "",
    bairro: vaga.bairro ?? "",
    data_servico: vaga.data_servico ?? "",
    hora_inicio: vaga.hora_inicio ?? "",
    valor_diaria: vaga.valor_diaria != null ? String(vaga.valor_diaria) : "",
    quantidade_vagas: vaga.quantidade_vagas != null ? String(vaga.quantidade_vagas) : "1",
  };

  return (
    <TelaComHeader titulo="Editar diária" voltar={`/minhas-vagas/${id}/candidatos`}>
      <PublicarForm
        action={editarVagaAction.bind(null, id)}
        iniciais={iniciais}
        titulo=""
        enviarLabel="SALVAR ALTERAÇÕES"
        enviando="Salvando…"
      />
    </TelaComHeader>
  );
}
