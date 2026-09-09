// Pix estático (BR Code / EMV MPM) — sem dependências de runtime, framework-
// agnóstico. A string devolvida é AO MESMO TEMPO o "Pix Copia e Cola" e o
// conteúdo exato pra gerar o QR code.
//
// Um Pix estático não precisa de integração com banco/PSP: só codifica a
// chave do recebedor + nome + cidade (+ valor opcional). O dinheiro é
// roteado pela chave Pix, que já precisa estar cadastrada no banco de quem
// recebe. Portado de refs/foco-contabil/lib/pix/static-qr.ts.
//
// Referência: Banco Central, "Manual de Padrões para Iniciação do Pix" / EMV MPM.

export interface PixEstaticoParams {
  /** Chave Pix do recebedor: CPF/CNPJ, e-mail, telefone (+55...) ou chave aleatória. */
  chave: string;
  /** Nome do recebedor exibido no pagamento (máx. 25 caracteres, ASCII). */
  nome: string;
  /** Cidade do recebedor (máx. 15 caracteres). */
  cidade: string;
  /** Valor em reais. Omitido => quem paga digita o valor. */
  valor?: number;
  /** Identificador da transação (máx. 25). "***" quando não usado. */
  txid?: string;
}

// Campo EMV: ID (2) + tamanho (2, com zero à esquerda) + valor.
function campo(id: string, valor: string): string {
  const tam = valor.length.toString().padStart(2, "0");
  return `${id}${tam}${valor}`;
}

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — exigido pelo Bacen no campo 63.
// Valor canônico de verificação: crc16("123456789") === "29B1".
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Remove acentos/especiais e maiusculiza. O tamanho conta caracteres já
// limpos, então corta DEPOIS de limpar. Alguns leitores de banco travam com
// não-ASCII.
export function sanitizarAscii(texto: string, tamMax: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, tamMax);
}

/**
 * Mascara uma chave Pix pra exibição (não vaza CPF/e-mail inteiro na tela).
 * "12.345.678/0001-90" → "12.•••••0-90".
 */
export function mascararChavePix(chave: string): string {
  const k = chave.trim();
  if (k.length <= 6) return k;
  return `${k.slice(0, 3)}••••${k.slice(-3)}`;
}

/**
 * Monta o payload Pix estático. Devolve a string Copia e Cola, que também é
 * o conteúdo exato do QR. Lança erro se a chave estiver vazia.
 */
export function montarPixEstatico(params: PixEstaticoParams): string {
  const chave = params.chave.trim();
  if (!chave) throw new Error("Chave Pix é obrigatória");

  const nome = sanitizarAscii(params.nome, 25) || "RECEBEDOR";
  const cidade = sanitizarAscii(params.cidade, 15) || "BRASIL";
  const txid = params.txid?.trim() || "***";

  const contaRecebedor = campo("26", campo("00", "br.gov.bcb.pix") + campo("01", chave));

  const valor = params.valor != null && params.valor > 0 ? campo("54", params.valor.toFixed(2)) : "";

  const dadosAdicionais = campo("62", campo("05", txid));

  const payload =
    campo("00", "01") + // indicador de formato do payload
    campo("01", "11") + // método: 11 = estático/reutilizável
    contaRecebedor +
    campo("52", "0000") + // MCC
    campo("53", "986") + // moeda: BRL
    valor +
    campo("58", "BR") + // país
    campo("59", nome) +
    campo("60", cidade) +
    dadosAdicionais +
    "6304"; // id+tamanho do CRC; o valor é calculado sobre tudo até aqui

  return payload + crc16(payload);
}
