/**
 * Foto pública aleatória para quem ainda não tem foto — decisão do Leonardo em
 * 10/09/2026: "nenhuma conta sem foto; quem estiver sem, recebe uma foto
 * pública gratuita da internet, respeitando o gênero".
 *
 * Fonte: os retratos do randomuser.me (100 masculinos e 100 femininos, URL
 * estável, feitos para uso como foto de exemplo). A escolha é DETERMINÍSTICA
 * pelo id da pessoa: a mesma conta sempre ganha o mesmo rosto (no cadastro, no
 * script de preenchimento e depois de remover a própria foto), sem precisar
 * guardar nada além da URL em `profiles.foto_url`.
 *
 * Gênero: masculino → retrato masculino; feminino → feminino; não informado
 * ou "outro" → o próprio id decide entre os dois.
 */

const TOTAL_POR_GENERO = 100;

/** Hash FNV-1a de 32 bits — só para espalhar ids de forma estável, não é segurança. */
function hashDe(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** URL da foto pública da pessoa, escolhida pelo id e pelo gênero cadastrado. */
export function fotoAleatoria(userId: string, genero: string | null | undefined): string {
  const h = hashDe(userId);
  const pasta =
    genero === "masculino" ? "men" : genero === "feminino" ? "women" : h % 2 === 0 ? "men" : "women";
  return `https://randomuser.me/api/portraits/${pasta}/${h % TOTAL_POR_GENERO}.jpg`;
}
