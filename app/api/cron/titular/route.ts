import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAction } from "@/lib/log";
import { segredoConfere } from "@/lib/seguranca";
import { anonimizarTitular } from "@/lib/titular/anonimizar";

/**
 * `GET /api/cron/titular`: processamento diário do direito de exclusão
 * (LGPD art. 18, VI; decisão D-023). Duas tarefas de retenção, na mesma
 * rota porque as duas são "arrumar o que passou do prazo", uma vez por dia:
 *
 * 1. Anonimiza (`lib/titular/anonimizar.ts`) todo pedido `pendente` cuja
 *    carência de 7 dias já venceu (`pode_processar_em` no passado) — nunca
 *    deleta ninguém, e a própria `anonimizarTitular` marca o pedido como
 *    `concluido`. Rodando uma vez por dia, o prazo real fica entre 7 e no
 *    máximo 15 dias após o pedido, dentro do que `/perfil/editar` promete.
 * 2. Expurga `login_logs` com mais de 180 dias — a auditoria de acesso não
 *    tem valor indefinido, e reter para sempre é o oposto de minimização
 *    (parecer da conselheira de proteção de dados, achado [MÉDIO]).
 *
 * Protegido por bearer secret (`CRON_SECRET`), como `/api/cron/lembretes-avaliacao`
 * — ver `lib/seguranca.ts:segredoConfere`. Sem o segredo configurado, RECUSA.
 */
export const dynamic = "force-dynamic";

const RETENCAO_LOGIN_LOGS_DIAS = 180;

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  const autorizado = segredoConfere(req.headers.get("authorization"), segredo);
  if (!autorizado) {
    logAction("cron_titular", { result: "negado" });
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const db = createAdminClient();

  const { data: pendentes, error: erroPendentes } = await db
    .from("pedidos_exclusao")
    .select("id, user_id")
    .eq("status", "pendente")
    .lte("pode_processar_em", new Date().toISOString());
  if (erroPendentes) {
    logAction("cron_titular", { result: "erro", etapa: "listar_pendentes", code: erroPendentes.code });
    return NextResponse.json({ status: "erro" }, { status: 500 });
  }

  let anonimizados = 0;
  for (const pedido of pendentes ?? []) {
    try {
      await anonimizarTitular(db, pedido.user_id);
      anonimizados += 1;
    } catch (e) {
      // Um pedido com problema não pode travar os outros da fila — cada
      // usuário é uma transação independente.
      logAction("cron_titular", {
        userId: pedido.user_id,
        result: "erro",
        etapa: "anonimizar",
        erro: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const limiteRetencao = new Date(Date.now() - RETENCAO_LOGIN_LOGS_DIAS * 86_400_000).toISOString();
  const { error: erroLogs, count: logsExpurgados } = await db
    .from("login_logs")
    .delete({ count: "exact" })
    .lt("created_at", limiteRetencao);
  if (erroLogs) {
    logAction("cron_titular", { result: "erro", etapa: "expurgar_login_logs", code: erroLogs.code });
    return NextResponse.json({ status: "erro" }, { status: 500 });
  }

  logAction("cron_titular", { result: "ok", anonimizados, logs_expurgados: logsExpurgados ?? 0 });
  return NextResponse.json({ status: "ok", anonimizados, logs_expurgados: logsExpurgados ?? 0 });
}
