import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Find-or-create de conversas. Módulo server-only (NÃO é "use server"): as
 * funções usam o client admin para criar a linha e são chamadas por outras
 * server actions / server components — nunca expostas como action ao cliente.
 * A leitura das mensagens depois é sempre protegida pela RLS is_conversa_membro.
 */

/** Canal único da equipe. */
export async function ensureCanalEquipe(workspaceId: string): Promise<string> {
  const db = createAdminClient();
  const { data: existente } = await db
    .from("conversas")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("tipo", "canal_equipe")
    .maybeSingle();
  if (existente) return existente.id;
  const { data, error } = await db
    .from("conversas")
    .insert({ workspace_id: workspaceId, tipo: "canal_equipe" })
    .select("id")
    .single();
  if (error?.code === "23505") {
    const { data: r } = await db
      .from("conversas")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("tipo", "canal_equipe")
      .single();
    return r!.id;
  }
  if (error) throw error;
  return data.id;
}

/** DM externa equipe ↔ ajudante (uma por equipe+ajudante; persiste entre diárias). */
export async function ensureDmExterna(workspaceId: string, ajudanteId: string): Promise<string> {
  const db = createAdminClient();
  const { data: existente } = await db
    .from("conversas")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("tipo", "dm_externa")
    .eq("ajudante_id", ajudanteId)
    .maybeSingle();
  if (existente) return existente.id;
  const { data, error } = await db
    .from("conversas")
    .insert({ workspace_id: workspaceId, tipo: "dm_externa", ajudante_id: ajudanteId })
    .select("id")
    .single();
  if (error?.code === "23505") {
    const { data: r } = await db
      .from("conversas")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("tipo", "dm_externa")
      .eq("ajudante_id", ajudanteId)
      .single();
    return r!.id;
  }
  if (error) throw error;
  return data.id;
}

/** DM interna 1-a-1 entre dois membros da mesma equipe. */
export async function ensureDmInterna(
  workspaceId: string,
  userA: string,
  userB: string,
): Promise<string> {
  const db = createAdminClient();
  const { data: candidatas } = await db
    .from("conversas")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("tipo", "dm_interna");
  if (candidatas?.length) {
    const ids = candidatas.map((c) => c.id);
    const { data: membros } = await db
      .from("conversa_membros")
      .select("conversa_id, user_id")
      .in("conversa_id", ids);
    const porConversa = new Map<string, string[]>();
    for (const m of membros ?? []) {
      const arr = porConversa.get(m.conversa_id) ?? [];
      arr.push(m.user_id);
      porConversa.set(m.conversa_id, arr);
    }
    for (const c of candidatas) {
      const set = porConversa.get(c.id) ?? [];
      if (set.length === 2 && set.includes(userA) && set.includes(userB)) return c.id;
    }
  }
  const { data, error } = await db
    .from("conversas")
    .insert({ workspace_id: workspaceId, tipo: "dm_interna" })
    .select("id")
    .single();
  if (error) throw error;
  await db.from("conversa_membros").insert([
    { conversa_id: data.id, user_id: userA },
    { conversa_id: data.id, user_id: userB },
  ]);
  return data.id;
}
