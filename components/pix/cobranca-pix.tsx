"use client";

import { useMemo, useState } from "react";
import { montarPixEstatico } from "@/lib/pix/static-qr";
import { formatBRL, formatData } from "@/lib/format";
import { QrPix } from "@/components/pix/qr-pix";
import type { ChavePix } from "@/components/pix/chaves-pix";

/**
 * Cobrança Pix de um serviço — o próprio prestador gera e mostra a tela (o
 * cliente escaneia com o celular dele, presencialmente) ou compartilha pelo
 * WhatsApp. O QR é grande e leva no meio "Me Ajuda Aí", o nome, a data e o
 * valor (`QrPix`). Usa as chaves Pix do próprio prestador (migration 0056): a
 * padrão vem escolhida e, com mais de uma, um seletor discreto troca só nesta
 * cobrança. Nunca lê dado de outra pessoa (ver ROADMAP §0).
 */
export function CobrancaPix({
  chaves,
  nomePrestador,
  cidade,
  nomeCliente,
  data,
  descricao,
  valor,
}: {
  chaves: ChavePix[];
  nomePrestador: string;
  cidade: string | null;
  nomeCliente: string;
  data: string;
  descricao: string;
  valor: number;
}) {
  const [chaveId, setChaveId] = useState(() => (chaves.find((c) => c.padrao) ?? chaves[0])?.id ?? "");
  const chaveAtual = chaves.find((c) => c.id === chaveId) ?? chaves[0];
  const chavePix = chaveAtual?.chave ?? "";
  const payload = useMemo(() => {
    try {
      return montarPixEstatico({ chave: chavePix, nome: nomePrestador, cidade: cidade ?? "BRASIL", valor });
    } catch {
      return ""; // chave vazia — quem chama já checa antes.
    }
  }, [chavePix, nomePrestador, cidade, valor]);
  const linhas = useMemo(
    () => ({ nome: nomeCliente, data: formatData(data), valor: formatBRL(valor) }),
    [nomeCliente, data, valor],
  );

  if (!payload) return null;

  return (
    <div className="card flex flex-col items-center gap-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cobrar via Pix</p>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold">{nomeCliente}</p>
        <p className="text-xs text-muted">
          {formatData(data)} · {descricao}
        </p>
        <p className="text-lg font-bold text-brand">{formatBRL(valor)}</p>
      </div>
      {chaves.length > 1 ? (
        <label className="flex items-center gap-2 text-xs text-muted">
          Receber em
          <select
            className="input h-11 w-auto min-w-[9rem] py-0 text-sm"
            value={chaveId}
            onChange={(e) => setChaveId(e.target.value)}
          >
            {chaves.map((c) => (
              <option key={c.id} value={c.id}>
                {c.apelido}
                {c.padrao ? " (padrão)" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <QrPix
        payload={payload}
        linhas={linhas}
        textoCompartilhar={`Pix de ${nomePrestador} — ${descricao} (${formatData(data)}): ${formatBRL(valor)}.`}
      />
    </div>
  );
}
