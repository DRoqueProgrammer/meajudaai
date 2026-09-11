/**
 * Frases do Hero (ROADMAP.md §2.5): uma sorteada a cada vez que o Início abre.
 * Saíram no redesign da Fatia 3 (D-022) e VOLTARAM a pedido do Leonardo em
 * 10/09/2026 ("você retirou as frases que eu tinha pedido no início para
 * aparecer aleatoriamente. recoloque"). ~40 frases de domínio público ou
 * atribuição comum sobre trabalho, esforço e ofício.
 */
export const CITACOES: string[] = [
  "O trabalho duro vence o talento quando o talento não trabalha duro.",
  "Não é o mais forte que sobrevive, nem o mais inteligente, mas o que melhor se adapta.",
  "Faça o que puder, com o que tiver, onde estiver.",
  "A qualidade nunca é um acidente; é sempre o resultado de esforço inteligente.",
  "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
  "Quem sabe faz a hora, não espera acontecer.",
  "O trabalho bem feito fala por si.",
  "Cada dia é uma nova chance de fazer melhor.",
  "A confiança se constrói tijolo por tijolo.",
  "Um bom começo é a metade da obra.",
  "A prática leva à perfeição.",
  "Devagar se vai ao longe.",
  "O esforço de hoje é o resultado de amanhã.",
  "Quem planta cuidado, colhe confiança.",
  "Não existe elevador para o sucesso — tem que subir de escada.",
  "O amor pelo que se faz aparece no capricho do trabalho.",
  "Cada tijolo bem assentado sustenta o próximo.",
  "A pontualidade é a cortesia dos que fazem por merecer.",
  "Trabalho honesto não tem preço, tem valor.",
  "A experiência é o nome que damos aos nossos erros.",
  "Ninguém constrói nada sozinho — toda obra é uma equipe.",
  "O detalhe é o que separa o bom do excelente.",
  "Fazer certo da primeira vez economiza a segunda.",
  "A reputação se constrói serviço por serviço.",
  "Persistência é o caminho do êxito.",
  "Quem cuida da ferramenta, cuida do próprio ofício.",
  "Todo mestre já foi aprendiz.",
  "A confiança do cliente se ganha, não se pede.",
  "O trabalho dignifica quem o faz com orgulho.",
  "Um dia de cada vez constrói um projeto inteiro.",
  "A pressa é inimiga da perfeição, mas a procrastinação é inimiga do progresso.",
  "Servir bem é a melhor propaganda.",
  "O profissional se conhece pelo cuidado nos detalhes.",
  "Cada problema resolvido é uma habilidade a mais na bagagem.",
  "A organização economiza tempo e evita retrabalho.",
  "Bom humor no trabalho rende tanto quanto boa técnica.",
  "Ninguém nasceu sabendo — todos aprenderam fazendo.",
  "O respeito no trato vale tanto quanto a competência técnica.",
  "A segurança no trabalho é o primeiro passo do dia.",
  "Um cliente satisfeito traz o próximo.",
];

/** Sorteia uma citação (uso no cliente — chamar dentro de useEffect/useState, nunca no render do servidor, para não divergir da hidratação). */
export function citacaoAleatoria(): string {
  return CITACOES[Math.floor(Math.random() * CITACOES.length)]!;
}
