import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAction } from "@/lib/log";

/**
 * `GET /api/cron/lembretes-avaliacao`: dispara o lembrete de avaliação 24h após
 * a diária concluída. O endpoint só ENFILEIRA o trabalho — a regra (quem foi
 * aceito, ainda não avaliou e ainda não recebeu o lembrete) vive na função SQL
 * `enfileirar_lembretes_avaliacao()` (migration 0021), idempotente: rodar de
 * novo não duplica.
 *
 * Protegido por bearer secret (`CRON_SECRET`). O Vercel Cron manda esse header
 * automaticamente quando a env existe; pg_cron ou um scheduler externo mandam o
 * mesmo `Authorization: Bearer <segredo>`. Sem o segredo configurado o endpoint
 * RECUSA — nunca fica aberto. Ver docs/adr/0009. Sempre dinâmico: um cron
 * cacheado não faria trabalho nenhum.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  const autorizado =
    Boolean(segredo) && req.headers.get("authorization") === `Bearer ${segredo}`;
  if (!autorizado) {
    logAction("cron_lembretes_avaliacao", { result: "negado" });
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("enfileirar_lembretes_avaliacao");
  if (error) {
    logAction("cron_lembretes_avaliacao", { result: "erro", code: error.code });
    return NextResponse.json({ status: "erro" }, { status: 500 });
  }
  logAction("cron_lembretes_avaliacao", { result: "ok", enfileirados: data ?? 0 });
  return NextResponse.json({ status: "ok", enfileirados: data ?? 0 });
}
