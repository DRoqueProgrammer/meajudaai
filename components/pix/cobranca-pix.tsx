"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { montarPixEstatico } from "@/lib/pix/static-qr";
import { formatBRL, formatData } from "@/lib/format";

/**
 * Cobrança Pix de um serviço — o próprio prestador gera e mostra a tela (o
 * cliente escaneia com o celular dele, presencialmente). Nome/data/valor do
 * serviço ficam no meio, entre o cabeçalho e o QR, pra quem for pagar
 * conferir antes de escanear. Só precisa da própria `chave_pix` do
 * prestador — nunca lê dado de outra pessoa (ver ROADMAP §0).
 */
export function CobrancaPix({
  chavePix,
  nomePrestador,
  cidade,
  nomeCliente,
  data,
  descricao,
  valor,
}: {
  chavePix: string;
  nomePrestador: string;
  cidade: string | null;
  nomeCliente: string;
  data: string;
  descricao: string;
  valor: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  let payload = "";
  try {
    payload = montarPixEstatico({ chave: chavePix, nome: nomePrestador, cidade: cidade ?? "BRASIL", valor });
  } catch {
    // chave vazia — não deveria chegar aqui, quem chama já checa antes.
  }

  useEffect(() => {
    if (!payload || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, payload, { errorCorrectionLevel: "M", margin: 1, width: 200 }).catch(() =>
      setErro("Não foi possível gerar o QR."),
    );
  }, [payload]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar — copie manualmente o código abaixo.");
    }
  }

  if (!payload) return null;

  return (
    <div className="card flex flex-col items-center gap-2 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cobrar via Pix</p>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold">{nomeCliente}</p>
        <p className="text-xs text-muted">{formatData(data)} · {descricao}</p>
        <p className="text-lg font-bold text-brand">{formatBRL(valor)}</p>
      </div>
      <canvas ref={canvasRef} className="rounded-lg" />
      <button type="button" onClick={copiar} className="btn-ghost w-full text-xs">
        {copiado ? "Copiado!" : "Copiar código Pix"}
      </button>
      {erro ? <p className="text-xs text-danger">{erro}</p> : null}
    </div>
  );
}
