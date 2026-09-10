import "server-only";

/**
 * Contas de exemplo REAIS (não são o modo demo read-only de lib/auth/demo.ts,
 * que ficou obsoleto — os usuários stub de lá nunca chegaram a ser semeados).
 * Estas vêm de `scripts/seed-fake-data.mjs`: contas de verdade, editáveis,
 * uma por papel, pra mostrar o protótipo funcionando. Ver ROADMAP.md.
 *
 * R-43 (ADR 0012): a senha compartilhada (`SENHA_CONTA_EXEMPLO`) só existe no
 * servidor — `import "server-only"` estoura a build se algum componente de
 * cliente importar este arquivo, mesmo sem usar a senha diretamente.
 */
export const CONTAS_EXEMPLO = {
  cliente: {
    email: "marina.costa@meajudaai.app",
    nome: "Marina Costa",
    papel: "Cliente",
    blurb: "Busca prestadores por perto e agenda direto com eles.",
  },
  prestador_servico: {
    email: "joao.ferreira@meajudaai.app",
    nome: "João Ferreira",
    papel: "Prestador de Serviço",
    blurb: "Eletricista com agenda própria — 3 anos de histórico de serviços.",
  },
  funcionario: {
    email: "beatriz.andrade@meajudaai.app",
    nome: "Beatriz Andrade",
    papel: "Funcionário",
    blurb: "Vê só os módulos liberados pelo administrador da equipe.",
  },
  admin: {
    email: "marcelo.lopes@meajudaai.app",
    nome: "Marcelo Lopes",
    papel: "Administrador",
    blurb: "Dono da Construtora Lopes — gerencia equipe e workspace.",
  },
  sysadmin: {
    email: "ricardo.bastos@meajudaai.app",
    nome: "Ricardo Bastos",
    papel: "SysAdmin",
    blurb: "Administração da plataforma inteira, entre workspaces.",
  },
} as const;

export type PapelExemplo = keyof typeof CONTAS_EXEMPLO;

/** Senha única das contas de exemplo — mesma usada pelo script de seed. */
export const SENHA_CONTA_EXEMPLO = "MeAjudaAi2026!";

export function isPapelExemplo(v: string): v is PapelExemplo {
  return v in CONTAS_EXEMPLO;
}
