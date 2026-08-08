import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { nomeCategoria } from "@/lib/categorias";
import { agregarDemanda } from "@/lib/demanda-agregada";
import { BannerForm } from "@/components/banner-form";

export default async function AdminDemandaPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "sysadmin") redirect("/inicio");

  const sb = await createServerClient();
  const { data: rows } = await sb.from("demanda_servico").select("categoria, cidade");
  const agg = agregarDemanda(rows ?? []);
  const max = agg[0]?.total ?? 1;
  const { data: banner } = await sb
    .from("home_banner")
    .select("texto, ativo")
    .eq("id", 1)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Demanda reprimida</h1>
        <p className="text-sm text-muted">Onde há gente procurando serviço sem oferta.</p>
      </div>

      <div className="flex flex-col gap-2">
        {agg.map((d) => (
          <div key={`${d.categoria}-${d.cidade}`} className="flex items-center gap-3">
            <div className="w-40 shrink-0">
              <p className="text-sm font-medium">{nomeCategoria(d.categoria)}</p>
              <p className="text-xs text-muted">{d.cidade}</p>
            </div>
            <div className="h-6 flex-1 overflow-hidden rounded bg-black/5">
              <div className="h-6 rounded bg-brand" style={{ width: `${(d.total / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right text-sm font-semibold tabular-nums">{d.total}</span>
          </div>
        ))}
        {agg.length === 0 ? <p className="card-vazio">Nenhuma demanda registrada ainda.</p> : null}
      </div>

      <BannerForm texto={banner?.texto ?? ""} ativo={banner?.ativo ?? false} />
    </div>
  );
}
