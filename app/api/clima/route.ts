import { NextResponse, type NextRequest } from "next/server";
import { buscarClima } from "@/lib/clima";

/**
 * Tempo do Hero (`GET /api/clima?cidade=...`), consumido por
 * `components/hero-card.tsx`: `{ agora, previsao }` (o agora e os 4 dias). O
 * navegador só fala com o nosso domínio — é o SERVIDOR quem busca na Open-Meteo
 * (`lib/clima.ts`), então o IP de quem visita nunca sai da nossa
 * infraestrutura antes de qualquer consentimento (parecer LGPD, vistoria
 * 10/09/2026). Só chamada depois do login (o Hero mora em `/inicio`), então não
 * precisa entrar na lista de rotas públicas do middleware.
 */
export async function GET(request: NextRequest) {
  const cidade = request.nextUrl.searchParams.get("cidade");
  if (!cidade) return NextResponse.json({ agora: null, previsao: null });
  const clima = await buscarClima(cidade);
  return NextResponse.json({ agora: clima?.agora ?? null, previsao: clima?.dias ?? null });
}
