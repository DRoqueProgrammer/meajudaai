import { NextResponse, type NextRequest } from "next/server";
import { buscarPrevisao } from "@/lib/clima";

/**
 * Previsão do tempo do Hero (`GET /api/clima?cidade=...`), consumida por
 * `components/hero-card.tsx`. O navegador só fala com o nosso domínio — é o
 * SERVIDOR quem busca na Open-Meteo (`lib/clima.ts`), então o IP de quem
 * visita nunca sai da nossa infraestrutura antes de qualquer consentimento
 * (parecer LGPD, vistoria 10/09/2026). Só chamada depois do login (o Hero
 * mora em `/inicio`), então não precisa entrar na lista de rotas públicas do
 * middleware.
 */
export async function GET(request: NextRequest) {
  const cidade = request.nextUrl.searchParams.get("cidade");
  if (!cidade) return NextResponse.json({ previsao: null });
  const previsao = await buscarPrevisao(cidade);
  return NextResponse.json({ previsao });
}
