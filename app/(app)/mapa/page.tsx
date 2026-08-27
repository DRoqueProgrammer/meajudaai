import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/roles";
import { guardModule } from "@/lib/auth/modules";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import { createServerClient } from "@/lib/supabase/server";
import { VagasMap, type VagaPonto } from "@/components/maps/vagas-map-dynamic";

/**
 * Ajudante → descoberta: vagas abertas por perto, com localização APROXIMADA
 * (vagas.local_aprox_*). Sócio/funcionário liberado → vagas da própria equipe
 * com o ponto EXATO (vaga_local, liberado pela RLS). Sysadmin não usa mapa.
 */
/** Rota `/mapa` (módulo mapa): vagas abertas plotadas por coordenada aproximada. */
export default async function MapaPage() {
  const user = await requireUser();
  if (user.role === "funcionario") await guardModule("mapa");
  if (user.role === "sysadmin") redirect("/inicio");
  const sb = await createServerClient();

  let points: VagaPonto[] = [];
  let titulo = "Mapa";
  let descricao = "";

  if (user.role === "ajudante") {
    titulo = "Vagas perto de você";
    descricao = "Diárias abertas na região. A localização é aproximada até você ser contratado.";
    const { data } = await sb
      .from("vagas")
      .select("id, titulo, valor_diaria, cidade, categoria, data_servico, local_aprox_lat, local_aprox_lng")
      .eq("status", "aberta")
      .not("local_aprox_lat", "is", null);
    points = (data ?? [])
      .filter((v) => v.local_aprox_lat != null && v.local_aprox_lng != null)
      .map((v) => ({
        id: v.id,
        lat: v.local_aprox_lat!,
        lng: v.local_aprox_lng!,
        titulo: v.titulo,
        valor: v.valor_diaria,
        cidade: v.cidade,
        categoria: v.categoria,
        data: v.data_servico,
      }));
  } else {
    titulo = "Mapa da equipe";
    descricao = "As vagas da sua equipe, no ponto exato da obra.";
    const ws = await getActiveWorkspace();
    if (ws) {
      const { data: vagas } = await sb
        .from("vagas")
        .select("id, titulo, valor_diaria, cidade, categoria, data_servico")
        .eq("workspace_id", ws.workspace_id);
      const ids = (vagas ?? []).map((v) => v.id);
      const { data: locais } = ids.length
        ? await sb.from("vaga_local").select("vaga_id, lat, lng").in("vaga_id", ids)
        : { data: [] };
      const locDe = new Map((locais ?? []).map((l) => [l.vaga_id, l]));
      points = (vagas ?? [])
        .map((v) => {
          const l = locDe.get(v.id);
          return l
            ? {
                id: v.id,
                lat: l.lat,
                lng: l.lng,
                titulo: v.titulo,
                valor: v.valor_diaria,
                cidade: v.cidade,
                categoria: v.categoria,
                data: v.data_servico,
              }
            : null;
        })
        .filter((p): p is VagaPonto => p !== null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <p className="mt-0.5 text-sm text-muted">{descricao}</p>
      </div>
      {points.length === 0 ? (
        <div className="card">
          <p className="text-sm text-muted">Nenhuma vaga com localização no mapa ainda.</p>
        </div>
      ) : (
        <VagasMap points={points} />
      )}
    </div>
  );
}
