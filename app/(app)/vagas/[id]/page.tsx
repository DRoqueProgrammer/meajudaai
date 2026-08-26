import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { TelaComHeader, StarRating, StatusBadge, Avatar } from "@/components/ui";
import { CategoriaIcon } from "@/components/icons";
import { CandidatarButton } from "@/components/candidatar-button";
import { StatusTimeline } from "@/components/status-timeline";
import { Denunciar } from "@/components/denunciar";
import { VagaPublicada } from "@/components/vaga-publicada";
import { VagasMap } from "@/components/maps/vagas-map-dynamic";
import { CompartilharLocal } from "@/components/maps/compartilhar-local";
import { formatBRL, formatData, formatHora } from "@/lib/format";
import { nomeCategoria } from "@/lib/categorias";

/** Rota `/vagas/[id]`: detalhe da vaga e ação de candidatar-se (ou gerir, se for o dono). */
export default async function VagaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ publicada?: string }>;
}) {
  const { id } = await params;
  const { publicada } = await searchParams;
  const user = await getCurrentUser();
  const sb = await createServerClient();

  const { data: vaga } = await sb.from("vagas").select("*").eq("id", id).maybeSingle();
  if (!vaga) notFound();

  const { data: prof } = await sb
    .from("profiles")
    .select("user_id, nome, foto_url, nota_media, total_avaliacoes")
    .eq("user_id", vaga.criado_por)
    .maybeSingle();

  const { data: cand } = await sb
    .from("candidaturas")
    .select("id, status")
    .eq("vaga_id", id)
    .eq("ajudante_id", user!.id)
    .maybeSingle();

  const { data: aval } = await sb
    .from("avaliacoes")
    .select("id")
    .eq("vaga_id", id)
    .eq("avaliador_id", user!.id)
    .maybeSingle();

  // RLS vaga_local_select: só retorna para a equipe dona ou o ajudante contratado.
  const { data: local } = await sb.from("vaga_local").select("lat, lng").eq("vaga_id", id).maybeSingle();

  const ehDono = vaga.criado_por === user!.id;

  // Recibo de publicação: só para o dono, e só na volta do formulário.
  const recemPublicada = ehDono && publicada === "1";
  const { count: ajudantesNaCidade } = recemPublicada
    ? await sb
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("tipo_base", "ajudante")
        .eq("cidade", vaga.cidade)
    : { count: 0 };

  // Etapa da diária derivada dos status reais (ver components/status-timeline).
  const temRelacao = ehDono || !!cand;
  const terminal =
    vaga.status === "cancelada"
      ? "Vaga cancelada"
      : cand?.status === "recusado"
        ? "Candidatura recusada"
        : cand?.status === "cancelado"
          ? "Candidatura cancelada"
          : null;
  let etapa = 0;
  if (vaga.status === "finalizada") etapa = aval ? 4 : 3;
  else if (vaga.status === "em_andamento") etapa = 2;
  else if (cand?.status === "aceito") etapa = 1;

  return (
    <TelaComHeader titulo="Detalhes da vaga" voltar={recemPublicada ? "/minhas-vagas" : "/vagas"}>
      <div className="flex flex-col gap-4">
        {recemPublicada ? (
          <VagaPublicada cidade={vaga.cidade} ajudantes={ajudantesNaCidade ?? 0} />
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
              <CategoriaIcon slug={vaga.categoria} className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight">{vaga.titulo}</h1>
              <p className="mt-1 text-sm text-muted">
                {nomeCategoria(vaga.categoria)} · {vaga.cidade}
                {vaga.bairro ? `, ${vaga.bairro}` : ""}
              </p>
            </div>
          </div>
          <StatusBadge status={vaga.status} />
        </div>

        <div className="card flex items-baseline justify-between gap-3">
          <span className="text-[22px] font-bold text-brand">
            {formatBRL(vaga.valor_diaria)}
            <span className="text-xs font-normal text-muted"> / diária</span>
          </span>
          <span className="text-sm font-medium text-muted">
            <span aria-hidden="true">📅</span> {formatData(vaga.data_servico)} {formatHora(vaga.hora_inicio)}
          </span>
        </div>

        {vaga.descricao ? (
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Descrição</h2>
            <p className="text-sm leading-relaxed">{vaga.descricao}</p>
          </div>
        ) : null}

        {prof ? (
          <Link
            href={`/perfil/${prof.user_id}`}
            className="card flex items-center gap-3 transition hover:border-brand"
          >
            <Avatar nome={prof.nome} fotoUrl={prof.foto_url} />
            <div className="flex-1">
              <p className="text-xs text-muted">Profissional</p>
              <p className="font-medium">{prof.nome}</p>
              <StarRating nota={prof.nota_media} total={prof.total_avaliacoes} />
            </div>
            <span className="text-xs font-semibold text-brand">Ver perfil →</span>
          </Link>
        ) : null}

        {local ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Local da obra</h2>
            <VagasMap
              filtros={false}
              points={[
                {
                  id: vaga.id,
                  lat: local.lat,
                  lng: local.lng,
                  titulo: vaga.titulo,
                  valor: vaga.valor_diaria,
                  cidade: vaga.cidade,
                  categoria: vaga.categoria,
                  data: vaga.data_servico,
                },
              ]}
            />
            <CompartilharLocal modo="obra" lat={local.lat} lng={local.lng} />
            {!ehDono ? <CompartilharLocal modo="chegando" /> : null}
          </div>
        ) : null}

        {temRelacao ? <StatusTimeline current={etapa} terminal={terminal} /> : null}
        {!ehDono && vaga.status === "aberta" ? (
          <CandidatarButton vagaId={vaga.id} candidaturaId={cand?.id} candidaturaStatus={cand?.status} />
        ) : null}
        {!ehDono ? (
          <div className="border-t border-line pt-3">
            <Denunciar alvoTipo="vaga" alvoId={vaga.id} alvoNome={vaga.titulo} />
          </div>
        ) : null}
      </div>
    </TelaComHeader>
  );
}
