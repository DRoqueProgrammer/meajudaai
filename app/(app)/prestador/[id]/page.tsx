import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui";
import { SlotPicker } from "@/components/agenda/slot-picker";
import { nomeCategoria } from "@/lib/categorias";
import { listarTiposServico } from "@/lib/tipos-servico";
import { formatBRL } from "@/lib/format";

/**
 * Rota `/prestador/[id]` (cliente): perfil público do prestador — descrição,
 * preço e horários livres pra reservar. Ver ROADMAP.md §2.4.
 */
export default async function PerfilPrestadorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const sb = await createServerClient();
  const { data: p } = await sb
    .from("profiles")
    .select("nome, bio, foto_url, categoria, preco_tipo, preco_valor, nota_media, total_avaliacoes, tipo_base")
    .eq("user_id", id)
    .maybeSingle();
  if (!p || p.tipo_base !== "prestador_servico") notFound();

  const hojeStr = new Date().toLocaleDateString("sv-SE");
  const { data: slotsLivres } = await sb
    .from("agenda_slots")
    .select("id, data, hora_inicio, hora_fim")
    .eq("prestador_id", id)
    .eq("status", "livre")
    .gte("data", hojeStr)
    .order("data", { ascending: true })
    .order("hora_inicio", { ascending: true });
  const tipos = await listarTiposServico(sb);

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex items-center gap-4">
        <Avatar nome={p.nome} fotoUrl={p.foto_url} tamanho="lg" />
        <div>
          {/* H1 da página (parecer de design, item [ALTO]: a rota não tinha nenhum). */}
          <h1 className="text-lg font-semibold">{p.nome}</h1>
          <p className="text-sm text-muted">{p.categoria ? nomeCategoria(p.categoria) : "Categoria não informada"}</p>
          {p.total_avaliacoes > 0 ? (
            <p className="text-xs text-muted">⭐ {p.nota_media} ({p.total_avaliacoes} avaliações)</p>
          ) : null}
        </div>
      </div>

      {p.bio ? <p className="text-sm leading-relaxed">{p.bio}</p> : null}

      {p.preco_valor != null ? (
        <div>
          <p className="text-lg font-bold text-brand">
            {formatBRL(p.preco_valor)} {p.preco_tipo === "hora" ? <span className="text-sm font-normal text-muted">/ hora</span> : null}
          </p>
          <p className="text-xs text-muted">
            O valor pode ser ajustado depois que o prestador avaliar o serviço no local.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Horários disponíveis</h2>
        {user.role !== "cliente" ? (
          <p className="text-sm text-muted">Só clientes podem agendar um horário.</p>
        ) : (
          <SlotPicker slots={slotsLivres ?? []} tipos={tipos} />
        )}
      </div>
    </div>
  );
}
