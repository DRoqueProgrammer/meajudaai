"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { salvarAssinaturaAction, apagarAssinaturaAction } from "@/lib/actions/financeiro";
import { FormError } from "@/components/ui";

interface Ponto {
  x: number;
  y: number;
}

interface Limites {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Pad de assinatura do Administrador para os recibos (migration 0058,
 * D-047): desenha num `<canvas>` com Pointer Events (funciona com mouse,
 * dedo e caneta — um único listener pros três), escala o canvas pelo
 * `devicePixelRatio` pra não ficar borrado em tela de retina, suaviza o
 * traço com curva quadrática entre pontos médios (o `lineTo` puro fica
 * "serrilhado" em traço rápido) e recorta o espaço em branco em volta antes
 * de exportar — sem isso o PNG salvo era do tamanho do canvas inteiro, quase
 * todo transparente.
 *
 * Na conta de exemplo (`exemplo`), a assinatura fica sempre desligada (a
 * policy do banco já recusaria a escrita) — mostra só a explicação, pra não
 * oferecer um pad que nunca vai salvar.
 */
export function AssinaturaPad({
  assinaturaAtual,
  exemplo,
}: {
  assinaturaAtual: string | null;
  exemplo: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const pontos = useRef<Ponto[]>([]);
  const limites = useRef<Limites | null>(null);
  const [vazio, setVazio] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(assinaturaAtual);
  const [pending, start] = useTransition();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "#1f2937";
  }, []);

  function posicao(e: React.PointerEvent<HTMLCanvasElement>): Ponto {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function expandirLimites(p: Ponto) {
    limites.current = limites.current
      ? {
          minX: Math.min(limites.current.minX, p.x),
          minY: Math.min(limites.current.minY, p.y),
          maxX: Math.max(limites.current.maxX, p.x),
          maxY: Math.max(limites.current.maxY, p.y),
        }
      : { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y };
  }

  function iniciar(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    desenhando.current = true;
    const p = posicao(e);
    pontos.current = [p];
    expandirLimites(p);
    setVazio(false);
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = posicao(e);
    pontos.current.push(p);
    expandirLimites(p);
    const pts = pontos.current;
    const n = pts.length;
    if (n < 3) return;
    // Curva quadrática entre pontos médios: o traço passa perto de todos os
    // pontos capturados, mas sem os "cotovelos" de ligar cada um por reta.
    const p0 = pts[n - 3]!;
    const p1 = pts[n - 2]!;
    const p2 = pts[n - 1]!;
    const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(mid1.x, mid1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
    ctx.stroke();
  }

  function finalizar() {
    desenhando.current = false;
    pontos.current = [];
  }

  function limpar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    limites.current = null;
    setVazio(true);
    setErro(null);
  }

  /** Recorta a área desenhada (+ uma margem) num canvas novo e exporta como PNG. `null` se nada foi desenhado. */
  function recortarEExportar(): string | null {
    const canvas = canvasRef.current;
    if (!canvas || !limites.current) return null;
    const dpr = window.devicePixelRatio || 1;
    const pad = 8;
    const minX = Math.max(0, limites.current.minX - pad);
    const minY = Math.max(0, limites.current.minY - pad);
    const maxX = Math.min(canvas.clientWidth, limites.current.maxX + pad);
    const maxY = Math.min(canvas.clientHeight, limites.current.maxY + pad);
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const recorte = document.createElement("canvas");
    recorte.width = Math.round(w * dpr);
    recorte.height = Math.round(h * dpr);
    const ctx = recorte.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(canvas, minX * dpr, minY * dpr, w * dpr, h * dpr, 0, 0, recorte.width, recorte.height);
    return recorte.toDataURL("image/png");
  }

  function salvar() {
    setErro(null);
    const imagem = recortarEExportar();
    if (!imagem) {
      setErro("Desenhe a assinatura antes de salvar.");
      return;
    }
    start(async () => {
      const r = await salvarAssinaturaAction(imagem);
      if (r.ok) {
        setSalvo(imagem);
        limpar();
      } else {
        setErro(r.erro ?? "Não foi possível salvar a assinatura.");
      }
    });
  }

  function apagar() {
    setErro(null);
    start(async () => {
      const r = await apagarAssinaturaAction();
      if (r.ok) setSalvo(null);
      else setErro(r.erro ?? "Não foi possível apagar a assinatura.");
    });
  }

  if (exemplo) {
    return (
      <p className="text-sm text-muted">
        Na conta de demonstração, os recibos usam o nome em letra cursiva — a assinatura fica desligada.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {salvo ? (
        <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={salvo} alt="Sua assinatura atual" className="h-14 object-contain" />
          <button type="button" disabled={pending} onClick={apagar} className="btn-ghost text-xs">
            Apagar
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Você ainda não desenhou uma assinatura — os recibos usam seu nome em letra cursiva.
        </p>
      )}

      <div>
        <canvas
          ref={canvasRef}
          onPointerDown={iniciar}
          onPointerMove={mover}
          onPointerUp={finalizar}
          onPointerLeave={finalizar}
          onPointerCancel={finalizar}
          className="h-40 w-full touch-none rounded-xl border border-dashed border-line-strong bg-card"
          aria-label="Área para desenhar a assinatura"
          role="img"
        />
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={limpar} className="btn-ghost">
            Limpar
          </button>
          <button type="button" disabled={pending || vazio} onClick={salvar} className="btn-brand">
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
        {erro ? <FormError>{erro}</FormError> : null}
      </div>
    </div>
  );
}
