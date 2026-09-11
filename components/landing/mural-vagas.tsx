"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { nomeCategoria } from "@/lib/categorias";
import { waLinkVaga } from "@/lib/whatsapp";

/** O que o carrossel precisa de cada vaga — recorte de `anuncios_publicos(p_tipo: 'vaga_ajudante')`. */
export interface VagaAnuncio {
  id: string;
  titulo: string;
  descricao: string;
  cidade: string | null;
  estado: string | null;
  whatsapp: string | null;
  prestador_nome: string;
  prestador_categoria: string | null;
  prestador_foto: string | null;
  exemplo: boolean;
}

/** Um cartão do carrossel: a vaga, quem publicou e o WhatsApp pra chamar. */
function CartaoVaga({ vaga }: { vaga: VagaAnuncio }) {
  return (
    <div className="card flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-block rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-[#3a2f00]">
          Necessita-se ajudante!
        </span>
        {vaga.exemplo ? (
          <span className="inline-block rounded-full bg-tint-neutral px-2 py-0.5 text-xs font-medium text-muted">
            Exemplo
          </span>
        ) : null}
      </div>

      <div>
        <p className="text-base font-semibold leading-tight text-ink">{vaga.titulo}</p>
        <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-muted">{vaga.descricao}</p>
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-line pt-3">
        <div className="flex items-center gap-3">
          <Avatar nome={vaga.prestador_nome} fotoUrl={vaga.prestador_foto} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{vaga.prestador_nome}</p>
            {vaga.prestador_categoria ? (
              <p className="truncate text-xs text-muted">{nomeCategoria(vaga.prestador_categoria)}</p>
            ) : null}
            {vaga.cidade ? (
              <p className="truncate text-xs text-muted">
                {vaga.cidade}
                {vaga.estado ? `, ${vaga.estado}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        {vaga.whatsapp ? (
          <a
            href={waLinkVaga(vaga.whatsapp, vaga.titulo)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-action w-full"
          >
            Chamar no WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Carrossel público "Necessita-se ajudante!" (pedido do Leonardo em
 * 10/09/2026): vagas de ajudante — sem conta no app, combina direto com o
 * prestador pelo WhatsApp que ele escolheu mostrar naquela vaga. Client
 * Component só pela interação (setas, teclado, indicador); os dados chegam
 * prontos de `app/page.tsx` (RPC pública `anuncios_publicos`), nunca
 * buscados aqui — a landing nunca usa a chave de serviço.
 *
 * Sem autoplay (o app inteiro respeita `prefers-reduced-motion`, e um
 * carrossel de WhatsApp que troca sozinho é só chance de clicar errado).
 * Rolagem horizontal com scroll-snap funciona por toque, mouse e teclado
 * (setas ←/→ quando a trilha está focada).
 */
export function MuralVagas({ vagas }: { vagas: VagaAnuncio[] }) {
  const trilhaRef = useRef<HTMLUListElement>(null);
  const [indiceAtivo, setIndiceAtivo] = useState(0);

  const atualizarIndice = useCallback(() => {
    const trilha = trilhaRef.current;
    if (!trilha) return;
    const cartoes = Array.from(trilha.children) as HTMLElement[];
    if (cartoes.length === 0) return;
    let maisProximo = 0;
    let menorDist = Infinity;
    cartoes.forEach((el, i) => {
      const dist = Math.abs(el.offsetLeft - trilha.scrollLeft);
      if (dist < menorDist) {
        menorDist = dist;
        maisProximo = i;
      }
    });
    setIndiceAtivo(maisProximo);
  }, []);

  function rolar(direcao: 1 | -1) {
    const trilha = trilhaRef.current;
    if (!trilha) return;
    const primeiroCartao = trilha.children[0] as HTMLElement | undefined;
    const passo = primeiroCartao
      ? primeiroCartao.getBoundingClientRect().width + 16
      : trilha.clientWidth * 0.85;
    trilha.scrollBy({ left: passo * direcao, behavior: "smooth" });
  }

  function aoTeclado(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      rolar(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      rolar(-1);
    }
  }

  if (vagas.length === 0) {
    return (
      <div>
        <h2 id="mural-vagas-titulo" className="text-2xl font-bold tracking-[-0.02em]">
          Necessita-se ajudante!
        </h2>
        <div className="card-vazio mt-4">
          <p className="font-medium text-ink">Nenhuma vaga publicada agora.</p>
          <p className="mt-1">
            Você é prestador?{" "}
            <Link href="/cadastro?papel=prestador_servico" className="text-brand underline">
              Publique sua vaga de ajudante
            </Link>{" "}
            — é grátis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-[56ch]">
        <h2 id="mural-vagas-titulo" className="text-2xl font-bold tracking-[-0.02em]">
          Necessita-se ajudante!
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          Vagas de prestadores procurando ajudante — sem conta no app. Valor e combinação ficam
          direto entre os dois, pelo WhatsApp.
        </p>
      </div>

      {/* Só para leitor de tela (aria-describedby da trilha) — quem usa mouse
          ou toque já vê os botões e a rolagem. */}
      <p id="mural-vagas-instrucao" className="sr-only">
        Use as setas do teclado, ou toque e arraste, para navegar entre as vagas.
      </p>

      <ul
        ref={trilhaRef}
        onScroll={atualizarIndice}
        onKeyDown={aoTeclado}
        tabIndex={0}
        role="region"
        aria-labelledby="mural-vagas-titulo"
        aria-describedby="mural-vagas-instrucao"
        className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 pl-1 pr-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {vagas.map((v) => (
          <li key={v.id} className="shrink-0 basis-[88%] snap-start sm:basis-[47%] lg:basis-[31.5%]">
            <CartaoVaga vaga={v} />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-4">
        {/* Indicador decorativo (a posição real já é anunciada pelo scroll da
            região acima) — por isso aria-hidden no grupo inteiro, sem role de
            tab que exigiria seleção por teclado que estes pontos não têm. */}
        <div className="flex gap-1.5" aria-hidden="true">
          {vagas.map((v, i) => (
            <span
              key={v.id}
              aria-hidden="true"
              className={`h-1.5 w-4 rounded-full transition ${
                i === indiceAtivo ? "bg-brand-fill" : "bg-line-strong"
              }`}
            />
          ))}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => rolar(-1)}
            aria-label="Vaga anterior"
            className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-card text-lg text-ink hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            onClick={() => rolar(1)}
            aria-label="Próxima vaga"
            className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-card text-lg text-ink hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
