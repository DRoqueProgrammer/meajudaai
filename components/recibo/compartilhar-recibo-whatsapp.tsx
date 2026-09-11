"use client";

import { useState } from "react";
import { WhatsAppIcon } from "@/components/icons";
import { waShareLink } from "@/lib/whatsapp";
import { AVISO_SEM_VALOR_FISCAL, AVISO_MARKETPLACE } from "@/lib/financeiro/avisos";

const LARGURA = 1080;
const MARGEM = 72;
const LARGURA_UTIL = LARGURA - MARGEM * 2;

export interface DadosRecibo {
  numero: string;
  pagadorNome: string;
  valorTexto: string;
  valorExtenso: string;
  referenteA: string;
  formaLabel: string;
  dataTexto: string;
  prestadorNome: string;
  funcao: string;
}

/**
 * "Compartilhar no WhatsApp" do recibo do prestador (D-048): desenha o mesmo
 * conteúdo do papel num `<canvas>` fora da tela — PNG de ~1080px de largura,
 * sempre em claro — e usa `navigator.share` com o arquivo (no molde de
 * `QrPix.compartilhar`). Sem suporte a compartilhar arquivo, baixa o PNG e
 * abre o WhatsApp já com um texto-resumo (`waShareLink`), pra colar a imagem
 * na conversa. Cancelar o compartilhamento nativo não é erro — só volta.
 */
export function CompartilharReciboWhatsApp({ dados, textoResumo }: { dados: DadosRecibo; textoResumo: string }) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function compartilhar() {
    setErro(null);
    setGerando(true);
    try {
      const canvas = desenharRecibo(dados);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      const arquivo = blob ? new File([blob], `recibo-${dados.numero}.png`, { type: "image/png" }) : null;
      if (arquivo && navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: `Recibo Nº ${dados.numero}`, text: textoResumo });
        return;
      }
      if (blob) baixarPng(blob, dados.numero);
      window.open(waShareLink(textoResumo), "_blank", "noopener,noreferrer");
    } catch (e) {
      // Quem cancelou o compartilhamento nativo não quer o plano B.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setErro("Não foi possível gerar a imagem do recibo — tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={compartilhar}
        disabled={gerando}
        className="btn h-11 w-fit bg-[#1f8f4e] px-4 text-sm text-white hover:brightness-95 disabled:opacity-70"
      >
        <WhatsAppIcon />
        {gerando ? "Gerando…" : "Compartilhar no WhatsApp"}
      </button>
      {erro ? <p className="text-xs text-danger">{erro}</p> : null}
    </div>
  );
}

/** Baixa o PNG (o viewer não tem como compartilhar arquivo direto pro WhatsApp Web/desktop). */
function baixarPng(blob: Blob, numero: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `recibo-${numero}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Quebra `texto` em linhas que cabem em `larguraMax`, com a fonte já ajustada no `ctx`. */
function quebrarLinhas(ctx: CanvasRenderingContext2D, texto: string, larguraMax: number): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (atual && ctx.measureText(tentativa).width > larguraMax) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/**
 * Desenha o recibo inteiro e devolve o canvas pronto. Duas passadas: a
 * primeira só mede (decide a altura, que depende de quanto os avisos e o
 * "referente a" quebram de linha); a segunda desenha de verdade, já com o
 * canvas no tamanho final. `desenharConteudo` é a mesma função nas duas —
 * sem `desenhar`, ela pula todo `fill`/`stroke`/`fillText`, mas ainda mede
 * texto e avança o cursor `y` do mesmo jeito.
 */
function desenharRecibo(d: DadosRecibo): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = LARGURA;
  canvas.height = 10;
  const ctxMedida = canvas.getContext("2d");
  if (!ctxMedida) return canvas;
  const altura = desenharConteudo(ctxMedida, d, false);

  canvas.height = Math.ceil(altura);
  const ctxFinal = canvas.getContext("2d");
  if (!ctxFinal) return canvas;
  desenharConteudo(ctxFinal, d, true);
  return canvas;
}

function desenharConteudo(ctx: CanvasRenderingContext2D, d: DadosRecibo, desenhar: boolean): number {
  const alturaHeader = 150;
  let y = 0;

  if (desenhar) {
    // A altura final só existe depois da 1ª passada — o chamador já
    // redimensionou o canvas antes desta 2ª chamada.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LARGURA, ctx.canvas.height);

    ctx.fillStyle = "#0D47A1";
    ctx.fillRect(0, 0, LARGURA, alturaHeader);
    ctx.fillStyle = "#FFC107";
    ctx.fillRect(0, alturaHeader - 8, LARGURA, 8);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "700 52px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Me Ajuda ", MARGEM, 74);
    const larguraMeAjuda = ctx.measureText("Me Ajuda ").width;
    ctx.fillStyle = "#FFC107";
    ctx.fillText("Aí", MARGEM + larguraMeAjuda, 74);

    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("RECIBO SEM VALOR FISCAL", MARGEM, 110);

    ctx.textAlign = "right";
    ctx.font = "700 28px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Nº ${d.numero}`, LARGURA - MARGEM, 74);
    ctx.font = "400 22px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(d.dataTexto, LARGURA - MARGEM, 106);
    ctx.textAlign = "left";
  }
  y = alturaHeader + 56;

  // Recebi de
  ctx.font = "700 22px system-ui, sans-serif";
  if (desenhar) {
    ctx.fillStyle = "#71717a";
    ctx.fillText("RECEBI DE", MARGEM, y);
  }
  y += 38;
  ctx.font = "600 40px system-ui, sans-serif";
  if (desenhar) {
    ctx.fillStyle = "#111827";
    ctx.fillText(d.pagadorNome, MARGEM, y);
  }
  y += 56;

  // Valor — card verde
  const alturaValorCard = 190;
  if (desenhar) {
    ctx.fillStyle = "#ecfdf5";
    ctx.strokeStyle = "#6ee7b7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(MARGEM, y, LARGURA_UTIL, alturaValorCard, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = "700 22px system-ui, sans-serif";
    ctx.fillStyle = "#065f46";
    ctx.fillText("A IMPORTÂNCIA DE", MARGEM + 28, y + 42);

    ctx.font = "700 64px system-ui, sans-serif";
    ctx.fillStyle = "#18181b";
    ctx.fillText(d.valorTexto, MARGEM + 28, y + 114);

    ctx.font = "italic 400 26px system-ui, sans-serif";
    ctx.fillStyle = "#52525b";
    ctx.fillText(`(${d.valorExtenso})`, MARGEM + 28, y + 158);
  }
  y += alturaValorCard + 44;

  // Referente a (com quebra de linha — descrições longas não podem vazar).
  ctx.font = "700 22px system-ui, sans-serif";
  if (desenhar) {
    ctx.fillStyle = "#71717a";
    ctx.fillText("REFERENTE A", MARGEM, y);
  }
  y += 38;
  ctx.font = "400 28px system-ui, sans-serif";
  for (const linha of quebrarLinhas(ctx, d.referenteA, LARGURA_UTIL)) {
    if (desenhar) {
      ctx.fillStyle = "#27272a";
      ctx.fillText(linha, MARGEM, y);
    }
    y += 36;
  }
  y += 8;
  ctx.font = "400 24px system-ui, sans-serif";
  if (desenhar) {
    ctx.fillStyle = "#52525b";
    ctx.fillText(`${d.formaLabel} · recebido em ${d.dataTexto}`, MARGEM, y);
  }
  y += 64;

  // Assinatura: cursiva, filete, nome impresso e a função — alinhados à direita.
  const larguraAssinatura = 440;
  const xEsquerda = LARGURA - MARGEM - larguraAssinatura;
  const xCentro = xEsquerda + larguraAssinatura / 2;
  ctx.font = "italic 700 46px 'Segoe Script', 'Brush Script MT', cursive";
  if (desenhar) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#111827";
    ctx.fillText(d.prestadorNome, xCentro, y);
    ctx.textAlign = "left";
  }
  y += 16;
  if (desenhar) {
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xEsquerda, y);
    ctx.lineTo(xEsquerda + larguraAssinatura, y);
    ctx.stroke();
  }
  y += 36;
  ctx.font = "600 26px system-ui, sans-serif";
  if (desenhar) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#111827";
    ctx.fillText(d.prestadorNome, xCentro, y);
  }
  y += 32;
  ctx.font = "400 24px system-ui, sans-serif";
  if (desenhar) {
    ctx.fillStyle = "#52525b";
    ctx.fillText(d.funcao, xCentro, y);
    ctx.textAlign = "left";
  }
  y += 56;

  // Avisos — legíveis, nunca escondidos (D-048): não vale nota fiscal e a
  // Me Ajuda Aí não se responsabiliza, é só o marketplace.
  if (desenhar) {
    ctx.strokeStyle = "#e4e4e7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGEM, y);
    ctx.lineTo(LARGURA - MARGEM, y);
    ctx.stroke();
  }
  y += 40;
  ctx.font = "400 22px system-ui, sans-serif";
  for (const aviso of [AVISO_SEM_VALOR_FISCAL, AVISO_MARKETPLACE]) {
    for (const linha of quebrarLinhas(ctx, aviso, LARGURA_UTIL)) {
      if (desenhar) {
        ctx.fillStyle = "#3f3f46";
        ctx.fillText(linha, MARGEM, y);
      }
      y += 32;
    }
    y += 14;
  }

  // Rodapé
  ctx.font = "400 20px system-ui, sans-serif";
  if (desenhar) {
    ctx.fillStyle = "#a1a1aa";
    ctx.fillText("Me Ajuda Aí · documento gerado eletronicamente, sem valor fiscal", MARGEM, y);
  }
  y += 48;

  return y;
}
