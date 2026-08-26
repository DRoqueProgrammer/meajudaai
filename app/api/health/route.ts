import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Health check (`GET /api/health`): liveness + readiness num alvo só.
 *
 * O middleware já trata `/api/health` como rota pública, mas o arquivo não
 * existia — sem ele o deploy não tem probe e uma queda do Supabase passa
 * despercebida até um usuário reclamar. Aqui o app confirma que está de pé E que
 * o banco responde, com uma leitura barata (equivalente ao `select 1`). Sempre
 * dinâmico: um health cacheado mentiria sobre o estado atual.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();
  try {
    // Leitura mínima numa tabela pequena (7 linhas de seed) só para provar que a
    // conexão e a query respondem. `head: true` não traz dados — só o round-trip.
    const db = createAdminClient();
    const { error } = await db
      .from("categorias_servico")
      .select("slug", { head: true, count: "exact" });
    if (error) throw error;
    return NextResponse.json({ status: "ok", db: "up", ms: Date.now() - inicio });
  } catch {
    // Sem detalhe do erro no corpo: um health público não vaza a topologia interna.
    return NextResponse.json(
      { status: "degraded", db: "down", ms: Date.now() - inicio },
      { status: 503 },
    );
  }
}
