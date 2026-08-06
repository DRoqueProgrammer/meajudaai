import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/roles";
import { createServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui";

/**
 * Caixa de mensagens — lista todas as conversas de que participo: o canal da
 * equipe, DMs com colegas e DMs com ajudantes contratados. A RLS
 * conversas_select já limita ao que é meu.
 */
export default async function MensagensPage() {
  const user = await getCurrentUser();
  const sb = await createServerClient();
  const meId = user!.id;

  const { data: convRows } = await sb
    .from("conversas")
    .select("id, tipo, ajudante_id, workspace_id")
    .order("created_at", { ascending: false });
  const conversas = convRows ?? [];
  const ids = conversas.map((c) => c.id);

  const { data: msgs } = ids.length
    ? await sb
        .from("mensagens")
        .select("conversa_id, conteudo, created_at")
        .in("conversa_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] };
  const ultima = new Map<string, { conteudo: string; created_at: string }>();
  for (const m of msgs ?? []) {
    if (m.conversa_id && !ultima.has(m.conversa_id)) ultima.set(m.conversa_id, m);
  }

  const wsIds = [...new Set(conversas.map((c) => c.workspace_id))];
  const { data: wss } = wsIds.length
    ? await sb.from("workspaces").select("id, nome").in("id", wsIds)
    : { data: [] };
  const nomeWs = new Map((wss ?? []).map((w) => [w.id, w.nome]));

  const dmInternaIds = conversas.filter((c) => c.tipo === "dm_interna").map((c) => c.id);
  const outroInterno = new Map<string, string>();
  if (dmInternaIds.length) {
    const { data: membros } = await sb
      .from("conversa_membros")
      .select("conversa_id, user_id")
      .in("conversa_id", dmInternaIds);
    for (const m of membros ?? []) {
      if (m.user_id !== meId) outroInterno.set(m.conversa_id, m.user_id);
    }
  }

  const outrosIds = [
    ...new Set([
      ...conversas
        .filter((c) => c.tipo === "dm_externa" && c.ajudante_id && c.ajudante_id !== meId)
        .map((c) => c.ajudante_id as string),
      ...outroInterno.values(),
    ]),
  ];
  const { data: perfis } = outrosIds.length
    ? await sb.from("profiles").select("user_id, nome, foto_url").in("user_id", outrosIds)
    : { data: [] };
  const nomeDe = new Map((perfis ?? []).map((p) => [p.user_id, p.nome]));
  const fotoDe = new Map((perfis ?? []).map((p) => [p.user_id, p.foto_url]));

  const display = (c: (typeof conversas)[number]): { nome: string; foto: string | null } => {
    if (c.tipo === "canal_equipe") return { nome: `Equipe · ${nomeWs.get(c.workspace_id) ?? ""}`, foto: null };
    if (c.tipo === "dm_externa") {
      if (c.ajudante_id === meId) return { nome: nomeWs.get(c.workspace_id) ?? "Equipe", foto: null };
      const aj = c.ajudante_id ?? "";
      return { nome: nomeDe.get(aj) ?? "Ajudante", foto: fotoDe.get(aj) ?? null };
    }
    const outro = outroInterno.get(c.id) ?? "";
    return { nome: nomeDe.get(outro) ?? "Colega", foto: fotoDe.get(outro) ?? null };
  };

  const ordenadas = [...conversas].sort((a, b) => {
    const ma = ultima.get(a.id)?.created_at ?? "";
    const mb = ultima.get(b.id)?.created_at ?? "";
    return mb.localeCompare(ma);
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Mensagens</h1>
        <p className="mt-0.5 text-sm text-muted">
          {ordenadas.length === 0
            ? "Nenhuma conversa ainda."
            : `${ordenadas.length} conversa${ordenadas.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {ordenadas.map((c) => {
          const d = display(c);
          const msg = ultima.get(c.id);
          return (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className="card flex items-center gap-3 transition hover:border-brand"
            >
              <Avatar nome={d.nome} fotoUrl={d.foto} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{d.nome}</p>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {msg?.conteudo ?? "Sem mensagens ainda."}
                </p>
              </div>
            </Link>
          );
        })}

        {ordenadas.length === 0 ? (
          <div className="card-vazio">
            <p className="text-sm text-muted">
              Suas conversas aparecem aqui — o canal da equipe, mensagens com colegas e com os
              ajudantes contratados.
            </p>
            <Link href="/vagas" className="btn-ghost mt-4">
              Ver vagas
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
