"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { WhatsAppIcon } from "@/components/icons";
import { waShareLink } from "@/lib/whatsapp";

/** Tamanho do QR na tela (px CSS); o canvas desenha em dobro para ficar nítido. */
const LADO = 340;

/**
 * QR Pix com os dados no meio (ROADMAP.md §16.2 e pedido do Leonardo em
 * 10/09/2026: "Me Ajuda Aí, seguido na outra linha de Nome, então Data e
 * Valor"). O código usa correção de erro nível H (o QR aguenta ~30% de área
 * perdida) e a caixa central ocupa bem menos que isso (~12% da área) — por isso
 * "precisa ser um QR code perfeito, mas com dados no meio" continua lendo. O
 * texto é desenhado NO canvas, então o que o celular lê, o que se copia como
 * imagem e o que se compartilha são a mesma coisa. A leitura é conferida por
 * `scripts/regressao/qr-pix.mjs` (jsQR sobre os pixels do canvas).
 *
 * Embaixo: "Copiar código Pix" (copia e cola) e "Compartilhar no WhatsApp"
 * (a imagem do QR pelo compartilhamento do aparelho; sem suporte, o texto com o
 * código pelo wa.me).
 */
export function QrPix({
  payload,
  linhas,
  textoCompartilhar,
}: {
  /** BR Code (copia e cola) já montado — `montarPixEstatico`. */
  payload: string;
  /** O que vai no meio do QR: nome, data e valor (a primeira linha é sempre "Me Ajuda Aí"). */
  linhas: { nome: string; data: string; valor: string };
  /** Texto que acompanha o compartilhamento (quem recebe, o quê, quanto). */
  textoCompartilhar: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !payload) return;
    const px = LADO * 2;
    let cancelado = false;
    QRCode.toCanvas(canvas, payload, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: px,
      color: { dark: "#0b1220", light: "#ffffff" },
    })
      .then(() => {
        if (cancelado) return;
        // A biblioteca grava largura e altura fixas no estilo; aqui a largura é
        // responsiva e a altura acompanha (senão o QR estica).
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        desenharCentro(canvas, linhas);
      })
      .catch(() => setErro("Não foi possível gerar o QR."));
    return () => {
      cancelado = true;
    };
  }, [payload, linhas]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar — selecione e copie o código abaixo.");
    }
  }

  async function compartilhar() {
    setErro(null);
    const texto = `${textoCompartilhar}\n\nPix copia e cola:\n${payload}`;
    const canvas = canvasRef.current;
    try {
      const blob = canvas ? await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png")) : null;
      const arquivo = blob ? new File([blob], "pix-me-ajuda-ai.png", { type: "image/png" }) : null;
      if (arquivo && navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], text: texto });
        return;
      }
    } catch (e) {
      // Quem cancelou o compartilhamento não quer o plano B.
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    window.open(waShareLink(texto), "_blank", "noopener,noreferrer");
  }

  if (!payload) return null;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        data-payload={payload}
        role="img"
        aria-label={`QR Pix — ${linhas.nome}, ${linhas.data}, ${linhas.valor}`}
        className="aspect-square w-full max-w-[340px] rounded-xl bg-white"
        style={{ width: "100%", maxWidth: LADO }}
      />
      <div className="grid w-full max-w-[340px] gap-2">
        <button
          type="button"
          onClick={compartilhar}
          className="btn h-11 bg-[#1f8f4e] text-white hover:brightness-95"
        >
          <WhatsAppIcon />
          Compartilhar no WhatsApp
        </button>
        <button type="button" onClick={copiar} className="btn-ghost h-11 text-sm">
          {copiado ? "Código copiado!" : "Copiar código Pix"}
        </button>
      </div>
      {erro ? <p className="text-xs text-danger">{erro}</p> : null}
    </div>
  );
}

/**
 * Caixa no centro do QR: faixa azul da marca com "Me Ajuda" em branco e "Aí" em
 * amarelo — como a logo (pedido do Leonardo: "bonito e colorido de forma
 * profissional e elegante") — e, no branco, nome, data e valor. O texto encolhe
 * para caber; a caixa não cresce (é o que mantém o QR legível).
 */
function desenharCentro(canvas: HTMLCanvasElement, linhas: { nome: string; data: string; valor: string }) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const lado = canvas.width;
  const familia = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const larguraCaixa = Math.round(lado * 0.46);
  const alturaCaixa = Math.round(lado * 0.27);
  const x = Math.round((lado - larguraCaixa) / 2);
  const y = Math.round((lado - alturaCaixa) / 2);
  const raio = Math.round(lado * 0.03);
  const alturaFaixa = Math.round(alturaCaixa * 0.34);
  const maxLargura = larguraCaixa * 0.88;

  const ajustar = (texto: string, peso: number, tamanhoInicial: number) => {
    let tamanho = tamanhoInicial;
    ctx.font = `${peso} ${tamanho}px ${familia}`;
    while (ctx.measureText(texto).width > maxLargura && tamanho > 10) {
      tamanho -= 1;
      ctx.font = `${peso} ${tamanho}px ${familia}`;
    }
    let t = texto;
    while (ctx.measureText(t).width > maxLargura && t.length > 3) t = `${t.slice(0, -2)}…`;
    return t;
  };

  ctx.save();
  // Sombra suave e caixa branca.
  ctx.shadowColor = "rgba(11, 18, 32, 0.18)";
  ctx.shadowBlur = Math.round(lado * 0.012);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x, y, larguraCaixa, alturaCaixa, raio);
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Faixa da marca (só os cantos de cima arredondados).
  const gradiente = ctx.createLinearGradient(x, y, x + larguraCaixa, y + alturaFaixa);
  gradiente.addColorStop(0, "#0D47A1");
  gradiente.addColorStop(1, "#0A3A85");
  ctx.fillStyle = gradiente;
  ctx.beginPath();
  ctx.roundRect(x, y, larguraCaixa, alturaFaixa, [raio, raio, 0, 0]);
  ctx.fill();

  // "Me Ajuda" branco + "Aí" amarelo, centralizados juntos.
  const tamanhoMarca = Math.round(lado * 0.048);
  ctx.font = `700 ${tamanhoMarca}px ${familia}`;
  const parte1 = "Me Ajuda ";
  const parte2 = "Aí";
  const w1 = ctx.measureText(parte1).width;
  const w2 = ctx.measureText(parte2).width;
  const inicio = lado / 2 - (w1 + w2) / 2;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(parte1, inicio, y + alturaFaixa / 2);
  ctx.fillStyle = "#FFC107";
  ctx.fillText(parte2, inicio + w1, y + alturaFaixa / 2);

  // Nome, data e valor no branco.
  const corpo = [
    { texto: linhas.nome, peso: 600, tamanho: Math.round(lado * 0.04), cor: "#0b1220" },
    { texto: linhas.data, peso: 400, tamanho: Math.round(lado * 0.034), cor: "#475569" },
    { texto: linhas.valor, peso: 700, tamanho: Math.round(lado * 0.048), cor: "#0D47A1" },
  ];
  const areaCorpo = alturaCaixa - alturaFaixa;
  const passo = areaCorpo / (corpo.length + 0.4);
  ctx.textAlign = "center";
  corpo.forEach((linha, i) => {
    const texto = ajustar(linha.texto, linha.peso, linha.tamanho);
    ctx.fillStyle = linha.cor;
    ctx.fillText(texto, lado / 2, y + alturaFaixa + passo * (i + 0.7));
  });

  // Contorno fino na cor da marca, por cima de tudo.
  ctx.strokeStyle = "#0D47A1";
  ctx.lineWidth = Math.max(2, Math.round(lado * 0.004));
  ctx.beginPath();
  ctx.roundRect(x, y, larguraCaixa, alturaCaixa, raio);
  ctx.stroke();
  ctx.restore();
}
