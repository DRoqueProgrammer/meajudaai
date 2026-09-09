import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/roles";
import { guardModule } from "@/lib/auth/modules";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import { createServerClient } from "@/lib/supabase/server";
import { VagasMap, type VagaPonto } from "@/components/maps/vagas-map-dynamic";
import { PontosMap, type MapaPonto } from "@/components/maps/pontos-map-dynamic";

/**
 * Rota `/mapa`. Dois modelos distintos coexistem (ver DESIGN_MEAJUDAAI_V2.md —
 * tensão não resolvida entre o fluxo de vagas por workspace v1 e o P2P v2):
 * - Prestador de Serviço (v2): mapa dos CLIENTES com serviço pendente/
 *   confirmado, pino aproximado (`meus_clientes_no_mapa`, migration 0033) —
 *   "vagas" não existe mais pra esse papel.
 * - Administrador/Funcionário (v1, fluxo de diária por workspace): mapa das
 *   vagas da equipe, ponto exato (`vaga_local`) — inalterado.
 * Cliente não usa esta rota — o mapa dele fica embutido em /buscar-prestador.
 */
export default async function MapaPage() {
  const user = await requireUser();
  if (user.role === "funcionario") await guardModule("mapa");
  if (user.role === "sysadmin") redirect("/inicio");
  if (user.role === "cliente") redirect("/buscar-prestador");
  const sb = await createServerClient();

  if (user.role === "prestador_servico") {
    const { data } = await sb.rpc("meus_clientes_no_mapa");
    const pontos: MapaPonto[] = (data ?? [])
      .filter((c) => c.lat_aprox != null && c.lng_aprox != null)
      .map((c) => ({
        id: c.cliente_id,
        lat: c.lat_aprox!,
        lng: c.lng_aprox!,
        titulo: c.nome,
        subtitulo: c.status === "confirmado" ? "Serviço confirmado" : "Aguardando confirmação",
        href: `/perfil/${c.cliente_id}`,
      }));

    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold">Mapa dos meus serviços</h1>
          <p className="mt-0.5 text-sm text-muted">
            Clientes com serviço pendente ou confirmado, localização aproximada.
          </p>
        </div>
        {pontos.length === 0 ? (
          <div className="card">
            <p className="text-sm text-muted">Nenhum serviço pendente ou confirmado no momento.</p>
          </div>
        ) : (
          <PontosMap pontos={pontos} />
        )}
      </div>
    );
  }

  // Administrador/Funcionário — fluxo v1 de vagas por workspace, ponto exato.
  let points: VagaPonto[] = [];
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Mapa da equipe</h1>
        <p className="mt-0.5 text-sm text-muted">As vagas da sua equipe, no ponto exato da obra.</p>
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
