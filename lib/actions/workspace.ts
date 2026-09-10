"use server";

import { after } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  requireWorkspaceRole,
  getActiveWorkspace,
  getMyWorkspaces,
  ACTIVE_WS_COOKIE,
} from "@/lib/auth/workspace";
import { tryWriter } from "@/lib/auth/guard";
import { podeAgirSobre } from "@/lib/auth/exemplo";
import { createAdminClient } from "@/lib/supabase/admin";
import { MENSAGEM_CONVITE_NEUTRA } from "@/lib/convite-texto";
import type { ActionResult } from "./auth";
import { campo, valoresPreservados, type EstadoForm } from "./form";

/** Troca a empresa ativa (seletor do admin com várias empresas). */
export async function setActiveWorkspaceAction(workspaceId: string): Promise<ActionResult> {
  const list = await getMyWorkspaces();
  if (!list.some((w) => w.workspace_id === workspaceId)) {
    return { ok: false, erro: "Equipe inválida." };
  }
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WS_COOKIE, workspaceId, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Cria uma nova praça e o autor passa a ser owner dela (ativa em seguida).
 * ADR 0013, D-016: a porta 3 (o próprio Administrador cria praça pelo
 * seletor) fecha — só o sysadmin cria praça agora, por /admin/pracas
 * (criarPracaAction, lib/actions/pracas.ts, é o caminho novo e preferido).
 *
 * R-42 (ADR 0012, D-015): mesma decisão de criarPracaAction e criarAdminAction
 * — cria dado real, então nem um sysadmin de exemplo (o que qualquer
 * visitante abre pela landing) pode.
 */
export async function criarEmpresaAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const preserva = valoresPreservados(fd);
  const nome = campo(fd, "nome");
  const cidade = campo(fd, "cidade");
  const estado = campo(fd, "estado");

  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  const user = w.user;
  if (user.role !== "sysadmin") {
    return { erro: "Apenas o sysadmin cria praças — use /admin/pracas.", valores: preserva };
  }
  if (Boolean(user.exemplo)) return { erro: "Conta de exemplo não pode criar praças.", valores: preserva };
  const db = createAdminClient();
  const { data: ws, error } = await db
    .from("workspaces")
    .insert({ owner_id: user.id, nome: nome || "Nova equipe", cidade, estado })
    .select("id")
    .single();
  if (error || !ws) return { erro: "Não foi possível criar a equipe.", valores: preserva };
  await db.from("workspace_members").insert({ workspace_id: ws.id, user_id: user.id, role: "owner" });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WS_COOKIE, ws.id, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Exclui uma praça. Bloqueia enquanto houver vaga aberta ou diária
 * em andamento — tem candidato contando com elas; primeiro cancela ou finaliza.
 * Vagas já finalizadas/canceladas somem junto (histórico da equipe); as
 * avaliações sobrevivem (a FK de avaliacoes.vaga_id é SET NULL).
 * ADR 0013, D-016: deixa de valer para quem não é sysadmin — checado antes
 * de qualquer consulta, junto com a porta 3 que criarEmpresaAction também fecha.
 *
 * R-42 (ADR 0012, D-015): apaga dado real, então nem um sysadmin de exemplo
 * pode — mesma decisão de criarPracaAction e criarAdminAction, só que do lado
 * de apagar em vez de criar.
 */
export async function excluirEquipeAction(workspaceId: string): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "sysadmin") return { ok: false, erro: "Apenas o sysadmin exclui praças." };
  if (Boolean(user.exemplo)) return { ok: false, erro: "Conta de exemplo não pode excluir praças." };

  const db = createAdminClient();
  const { data: ws } = await db
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws) return { ok: false, erro: "Equipe não encontrada." };

  const { count } = await db
    .from("vagas")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("status", ["aberta", "em_andamento"]);
  if (count && count > 0) {
    return {
      ok: false,
      erro: "Cancele ou finalize as vagas abertas e em andamento antes de excluir a equipe.",
    };
  }

  const { error } = await db.from("workspaces").delete().eq("id", workspaceId);
  if (error) return { ok: false, erro: "Não foi possível excluir a equipe." };

  // Era a equipe ativa? Limpa o cookie para o layout reescolher (ou nenhuma).
  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_WS_COOKIE)?.value === workspaceId) {
    cookieStore.delete(ACTIVE_WS_COOKIE);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * O dono adiciona à equipe alguém que já tem conta, pelo e-mail. Diferente do
 * convite por link (lib/actions/convite.ts): aqui o vínculo é imediato, sem
 * token nem aprovação. Notifica o novo membro.
 *
 * R-51 (tech-spec fatia-1-seguranca.md): a resposta é sempre a mesma
 * `MENSAGEM_CONVITE_NEUTRA` — e-mail sem conta, com conta que acabou de
 * entrar, com conta que já era da equipe, ou bloqueado pela regra do mundo
 * de exemplo (R-42, abaixo) — nenhuma delas diz nada sobre se a conta
 * existe. Por isso toda a parte que só roda quando a conta é encontrada
 * (achar o usuário, decidir se pode entrar, inserir o vínculo, notificar)
 * fica dentro de um `after()`: ele executa DEPOIS da resposta já ter saído,
 * então nenhum desses passos atrasa um ramo em relação aos outros — o tempo
 * de resposta observado por quem convida é o mesmo nos quatro casos, porque
 * nenhum deles é decidido antes de responder. A troca é a de sempre com
 * `after()`: a tela de equipe só reflete a entrada do novo membro no próximo
 * carregamento, não no instante da resposta — aceitável aqui porque a
 * resposta em si já não confirma nada.
 */
export async function convidarMembroAction(
  _estado: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  const email = campo(fd, "convidar-email");
  const preserva = { "convidar-email": email };

  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  const user = w.user;
  const ws = await getActiveWorkspace();
  if (!ws) return { erro: "Você não tem uma equipe.", valores: preserva };
  await requireWorkspaceRole(ws.workspace_id, ["owner"]);

  const db = createAdminClient();
  after(async () => {
    const { data: pii } = await db
      .from("profiles_pii")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    if (!pii) return;

    // R-42 (ADR 0012, D-015): ator de exemplo só adiciona quem também é de
    // exemplo — regra única em `podeAgirSobre`. Alvo fora do mundo de
    // exemplo, ou perfil que não foi encontrado: não adiciona, sem dizer
    // por quê (a resposta já saiu e já é a mesma nos dois casos).
    const { data: alvo } = await db
      .from("profiles")
      .select("exemplo")
      .eq("user_id", pii.user_id)
      .maybeSingle();
    if (!alvo || !podeAgirSobre({ exemplo: Boolean(user.exemplo) }, alvo)) return;

    const { error } = await db
      .from("workspace_members")
      .insert({ workspace_id: ws.workspace_id, user_id: pii.user_id, role: "membro" });
    if (error) return; // já estava na equipe — nada a notificar

    await db.from("notificacoes").insert({
      user_id: pii.user_id,
      tipo: "convite_equipe",
      titulo: "Você entrou em uma equipe",
      mensagem: `Você agora faz parte de "${ws.nome}".`,
      link: "/equipe",
    });
    revalidatePath("/equipe");
  });

  return { ok: true, mensagem: MENSAGEM_CONVITE_NEUTRA };
}
