"use client";

import { useMemo, useState } from "react";
import { montarPixEstatico } from "@/lib/pix/static-qr";
import { formatBRL, formatData } from "@/lib/format";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { QrPix } from "@/components/pix/qr-pix";

/** "6,99" / "6.99" / "1.234,50" → 6.99 / 1234.5; vazio ou inválido → null. */
function lerValor(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!limpo) return null;
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) && n > 0 && n <= 100_000 ? Math.round(n * 100) / 100 : null;
}

/**
 * Gerador de QR de UMA chave Pix, dentro de "Minhas chaves Pix" no perfil do
 * prestador (pedidos do Leonardo em 10/09/2026): para TESTAR a chave antes de
 * usar com cliente ("não confiar que está perfeito direto") e para COBRANÇAS
 * AVULSAS que não viram serviço ("6,99 de parafusos que o cliente precisou").
 * Valor e descrição são opcionais — sem valor, quem paga digita no app do
 * banco. Nada é gravado: é só o QR na tela e o compartilhamento.
 */
export function GeradorQrPix({ chavePix, nome, cidade }: { chavePix: string; nome: string; cidade: string | null }) {
  const [valorTexto, setValorTexto] = useState("");
  const [descricao, setDescricao] = useState("");
  const valor = lerValor(valorTexto);
  const valorInvalido = valorTexto.trim() !== "" && valor === null;

  const payload = useMemo(() => {
    try {
      return montarPixEstatico({ chave: chavePix, nome, cidade: cidade ?? "BRASIL", valor: valor ?? undefined });
    } catch {
      return "";
    }
  }, [chavePix, nome, cidade, valor]);
  const hoje = formatData(hojeEmSaoPaulo());
  const linhas = useMemo(
    () => ({ nome: descricao.trim() || nome, data: hoje, valor: valor ? formatBRL(valor) : "Valor em aberto" }),
    [descricao, nome, hoje, valor],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Teste o QR desta chave antes de usar com um cliente, ou gere uma cobrança avulsa — material que você comprou,
        um extra combinado na hora. Não vira serviço e nada fica gravado.
      </p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex flex-col gap-3">
          <div>
            <label className="label" htmlFor="qr-valor">
              Valor (opcional)
            </label>
            <input
              id="qr-valor"
              inputMode="decimal"
              className="input w-40"
              placeholder="Ex.: 6,99"
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              aria-invalid={valorInvalido || undefined}
              aria-describedby="qr-valor-dica"
            />
            <p id="qr-valor-dica" className={`mt-1 text-xs ${valorInvalido ? "text-danger" : "text-muted"}`}>
              {valorInvalido ? "Valor inválido — use, por exemplo, 6,99." : "Em branco, quem paga digita o valor no app do banco."}
            </p>
          </div>
          <div>
            <label className="label" htmlFor="qr-descricao">
              Do que é (opcional)
            </label>
            <input
              id="qr-descricao"
              className="input"
              maxLength={40}
              placeholder="Ex.: Parafusos e buchas"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted">
            Aponte a câmera do app do seu banco para o QR: ele deve abrir o Pix para <strong>{nome}</strong>
            {valor ? ` no valor de ${formatBRL(valor)}` : ""}. Se abrir certinho, está pronto para mandar.
          </p>
        </div>
        {payload ? (
          <QrPix
            payload={payload}
            linhas={linhas}
            textoCompartilhar={`Pix de ${nome}${descricao.trim() ? ` — ${descricao.trim()}` : ""}${valor ? `: ${formatBRL(valor)}` : ""}.`}
          />
        ) : (
          <p className="text-sm text-danger">Não foi possível montar o QR com a chave cadastrada. Confira a chave Pix em Editar perfil.</p>
        )}
      </div>
    </div>
  );
}
