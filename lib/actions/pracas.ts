"use server";

import { revalidatePath } from "next/cache";
import { tryWriter } from "@/lib/auth/guard";
import { podeAgirSobre } from "@/lib/auth/exemplo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./auth";
import { campo, valoresPreservados, type EstadoForm } from "./form";

/**
 * Praças e o vínculo Administrador–praça (R-46, R-47; ADR 0013; decisão
 * D-016; GAP-015). Só o SysAdmin cria praça e vincula um Administrador a uma
 * ou mais praças, com uma praça padrão — recusado ANTES de qualquer consulta
 * ou escrita para quem não é sysadmin (anti-padrão da spec: checar o papel
 * depois de escrever). Toda escrita usa a chave de serviço
 * (lib/supabase/admin.ts); o ator vem sempre de `tryWriter()`, nunca de
 * cookie de sessão.
 */

type DB = ReturnType<typeof createAdminClient>;

/**
 * Ids de `workspaces` do mundo de exemplo (R-42, ADR 0012, D-015): a praça
 * cujo dono é de exemplo, ou que tem algum membro de exemplo. Único critério
 * usado por `vincularAdministradorAction` quando o ator é de exemplo — para a
 * página `/admin/pracas` aplicar o mesmo recorte na listagem.
 */
async function pracasDoMundoDeExemplo(db: DB): Promise<Set<string>> {
  const { data: pessoasExemplo } = await db.from("profiles").select("user_id").eq("exemplo", true);
  const idsExemplo = new Set((pessoasExemplo ?? []).map((p) => p.user_id));
  if (idsExemplo.size === 0) return new Set();

  const [{ data: donos }, { data: membros }] = await Promise.all([
    db.from("workspaces").select("id, owner_id"),
    db.from("workspace_members").select("workspace_id, user_id"),
  ]);

  const out = new Set<string>();
  for (const w of donos ?? []) if (idsExemplo.has(w.owner_id)) out.add(w.id);
  for (const m of membros ?? []) if (idsExemplo.has(m.user_id)) out.add(m.workspace_id);
  return out;
}

/**
 * SysAdmin cria uma praça nova (R-46). Campos: nome, cidade, estado.
 *
 * D-010: `workspaces.owner_id` é obrigatório e significa o administrador
 * responsável pela praça; uma praça recém-criada, ainda sem Administrador
 * vinculado, nasce com o próprio SysAdmin criador como responsável
 * temporário (documentado em COMMENT ON na migration 0041) — muda de fato
 * quando `vincularAdministradorAction` vincular um Administrador de verdade.
 */
export async function criarPracaAction(_estado: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const preserva = valoresPreservados(fd);
  const nome = campo(fd, "nome");
  const cidade = campo(fd, "cidade");
  const estado = campo(fd, "estado");

  const w = await tryWriter();
  if ("erro" in w) return { erro: w.erro, valores: preserva };
  const user = w.user;
  if (user.role !== "sysadmin") return { erro: "Apenas o sysadmin cria praças.", valores: preserva };
  // Mundo de exemplo (R-42, D-015): criar praça é dado real — mesma decisão
  // de criarAdminAction (lib/actions/admin-users.ts): nem sysadmin de exemplo cria.
  if (Boolean(user.exemplo)) return { erro: "Conta de exemplo não pode criar praças.", valores: preserva };
  if (!nome) return { erro: "Informe o nome da praça.", valores: preserva };

  const db = createAdminClient();
  const { error } = await db
    .from("workspaces")
    .insert({ owner_id: user.id, nome, cidade: cidade || null, estado: estado || null });
  if (error) return { erro: "Não foi possível criar a praça.", valores: preserva };

  revalidatePath("/admin/pracas");
  return { ok: true };
}

/**
 * SysAdmin vincula um Administrador a uma ou mais praças, com uma praça
 * padrão entre elas (R-47). SUBSTITUI o conjunto atual do Administrador, mas
 * POR DIFERENÇA — nunca apaga tudo pra recriar: um insert que falhasse no
 * meio (id de praça inexistente, por exemplo) deixaria o Administrador sem
 * praça nenhuma, e os vínculos que continuam perderiam o `created_at`
 * original. Em vez disso: confere que toda praça pedida existe de verdade
 * (recusa antes de escrever se alguma não existir), tira a marca `padrao` dos
 * vínculos atuais, apaga só as linhas das praças que saíram, insere só as que
 * faltam e por fim marca a padrão — nessa ordem, pra nunca ter duas linhas
 * `padrao = true` do mesmo user_id ao mesmo tempo (índice único parcial,
 * migration 0041). O alvo precisa ser Administrador.
 *
 * D-010: `workspaces.owner_id` é o administrador responsável. Toda praça do
 * conjunto pedido cujo responsável ainda é o SysAdmin temporário
 * (criarPracaAction, quando a praça nasceu sem Administrador) passa a ter
 * como responsável o Administrador vinculado aqui — a praça sai da "espera"
 * assim que alguém de verdade assume.
 *
 * Mundo de exemplo (R-42, D-015): um ator de exemplo só vincula quem
 * `podeAgirSobre` alcança, e só a praças também do mundo de exemplo.
 */
export async function vincularAdministradorAction(
  adminId: string,
  pracaIds: string[],
  padraoId: string,
): Promise<ActionResult> {
  const w = await tryWriter();
  if ("erro" in w) return { ok: false, erro: w.erro };
  const user = w.user;
  if (user.role !== "sysadmin") return { ok: false, erro: "Apenas o sysadmin vincula administradores." };

  const idsUnicos = Array.from(new Set(pracaIds));
  if (idsUnicos.length === 0) return { ok: false, erro: "Escolha ao menos uma praça." };
  if (!idsUnicos.includes(padraoId)) {
    return { ok: false, erro: "A praça padrão precisa estar entre as vinculadas." };
  }

  const db = createAdminClient();

  const { data: alvo, error: alvoErr } = await db
    .from("profiles")
    .select("tipo_base, exemplo")
    .eq("user_id", adminId)
    .maybeSingle();
  if (alvoErr || !alvo) return { ok: false, erro: "Administrador não encontrado." };
  if (alvo.tipo_base !== "admin") return { ok: false, erro: "O alvo precisa ser Administrador." };
  if (!podeAgirSobre({ exemplo: Boolean(user.exemplo) }, alvo)) {
    return { ok: false, erro: "Conta de exemplo não pode vincular quem não é de exemplo." };
  }

  // Confere que toda praça pedida existe de verdade — antes de escrever, não
  // depois: um id inexistente aqui vira recusa limpa, nunca uma violação de FK
  // a meio caminho da escrita (achado do controller).
  const { data: pracasPedidas, error: pracasErr } = await db
    .from("workspaces")
    .select("id, owner_id")
    .in("id", idsUnicos);
  if (pracasErr) return { ok: false, erro: "Não foi possível conferir as praças." };
  const encontradas = new Set((pracasPedidas ?? []).map((p) => p.id));
  if (idsUnicos.some((id) => !encontradas.has(id))) {
    return { ok: false, erro: "Uma ou mais praças não existem." };
  }

  if (Boolean(user.exemplo)) {
    const pracasExemplo = await pracasDoMundoDeExemplo(db);
    const fora = idsUnicos.some((id) => !pracasExemplo.has(id));
    if (fora) return { ok: false, erro: "Conta de exemplo só vincula praças do mundo de exemplo." };
  }

  const { data: membrosAtuais, error: atuaisErr } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", adminId);
  if (atuaisErr) return { ok: false, erro: "Não foi possível conferir o vínculo atual." };
  const atuaisIds = new Set((membrosAtuais ?? []).map((m) => m.workspace_id));
  const saem = Array.from(atuaisIds).filter((id) => !idsUnicos.includes(id));
  const entram = idsUnicos.filter((id) => !atuaisIds.has(id));

  // 1) Tira a marca padrão de tudo que é deste Administrador hoje — só depois
  // marca a nova, no passo final, pra nunca ter duas linhas true ao mesmo tempo.
  const { error: limpaErr } = await db
    .from("workspace_members")
    .update({ padrao: false })
    .eq("user_id", adminId)
    .eq("padrao", true);
  if (limpaErr) return { ok: false, erro: "Não foi possível atualizar o vínculo." };

  // 2) Apaga só a linha de vínculo de quem saiu — a praça em si nunca é apagada.
  if (saem.length > 0) {
    const { error: delErr } = await db
      .from("workspace_members")
      .delete()
      .eq("user_id", adminId)
      .in("workspace_id", saem);
    if (delErr) return { ok: false, erro: "Não foi possível atualizar o vínculo." };
  }

  // 3) Insere só quem faltava (ainda sem a marca padrão — vem no passo 4).
  if (entram.length > 0) {
    const linhas = entram.map((id) => ({
      workspace_id: id,
      user_id: adminId,
      role: "owner" as const,
      padrao: false,
    }));
    const { error: insErr } = await db.from("workspace_members").insert(linhas);
    if (insErr) return { ok: false, erro: "Não foi possível criar o vínculo." };
  }

  // 4) Marca a padrão — única escrita com padrao = true desta chamada.
  const { error: marcaErr } = await db
    .from("workspace_members")
    .update({ padrao: true })
    .eq("user_id", adminId)
    .eq("workspace_id", padraoId);
  if (marcaErr) return { ok: false, erro: "Não foi possível marcar a praça padrão." };

  // D-010: transfere o responsável de toda praça do conjunto que ainda
  // pertencia a um SysAdmin temporário.
  const idsDonos = Array.from(new Set((pracasPedidas ?? []).map((p) => p.owner_id)));
  const { data: perfisDonos } = await db.from("profiles").select("user_id, tipo_base").in("user_id", idsDonos);
  const donosSysadmin = new Set(
    (perfisDonos ?? []).filter((p) => p.tipo_base === "sysadmin").map((p) => p.user_id),
  );
  const pracasParaTransferir = (pracasPedidas ?? [])
    .filter((p) => donosSysadmin.has(p.owner_id))
    .map((p) => p.id);
  if (pracasParaTransferir.length > 0) {
    const { error: ownerErr } = await db
      .from("workspaces")
      .update({ owner_id: adminId })
      .in("id", pracasParaTransferir);
    if (ownerErr) return { ok: false, erro: "Não foi possível atualizar o responsável da praça." };
  }

  revalidatePath("/admin/pracas");
  return { ok: true };
}
