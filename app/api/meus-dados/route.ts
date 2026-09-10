import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { exportarDadosDoTitular } from "@/lib/titular/exportar";
import { logAction } from "@/lib/log";

/**
 * `GET /api/meus-dados`: baixa um JSON com tudo o que é do usuário da SESSÃO
 * e as atividades dele desde o cadastro (LGPD art. 18, VI; decisão D-023) —
 * o botão "Baixar meus dados" do perfil.
 *
 * Nunca lê um id vindo de fora (query string, rota): a pessoa só pode baixar
 * os PRÓPRIOS dados, então a única fonte do `userId` é a sessão
 * (`getCurrentUser`). Sem sessão, 401 — nunca um arquivo vazio disfarçando o
 * caso de erro. Sempre dinâmico: depende do cookie de sessão de quem pediu.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    logAction("meus_dados", { result: "negado" });
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  // Chave de serviço para a leitura ficar completa (agenda, equipe, módulos
  // — várias dessas tabelas não têm policy de select para o próprio dono em
  // todo caso), nunca para decidir QUEM: o `userId` já veio da sessão, e
  // `exportarDadosDoTitular` filtra tudo por ele.
  const db = createAdminClient();
  const dados = await exportarDadosDoTitular(db, user.id);
  logAction("meus_dados", { userId: user.id, result: "ok" });

  const hoje = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(dados, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-${hoje}.json"`,
    },
  });
}
