import type { CurrentUser } from "./roles";

/**
 * Contas públicas de demonstração, semeadas no banco. Qualquer visitante pode
 * entrar por elas na landing ("Ver conta de exemplo"). Elas NÃO podem escrever
 * no banco compartilhado — senão um visitante alteraria a demo dos outros.
 * A checagem é feita no servidor, em cada server action de escrita.
 */

export const DEMO_ACCOUNTS = {
  joao: {
    email: "joao.demo@meajudaai.app",
    password: "DemoJoao2026!",
    nome: "João Eletricista",
    papel: "Profissional",
    blurb: "Publica diárias, escolhe candidatos e avalia ajudantes.",
  },
  carlos: {
    email: "carlos.demo@meajudaai.app",
    password: "DemoCarlos2026!",
    nome: "Carlos Silva",
    papel: "Ajudante",
    blurb: "Busca vagas na região, candidata-se e conversa pelo chat.",
  },
  ana: {
    email: "ana.demo@meajudaai.app",
    password: "DemoAna2026!",
    nome: "Ana Assistente",
    papel: "Funcionário",
    blurb: "Funcionária da empresa do João — vê só os módulos liberados pelo admin.",
  },
  admin: {
    email: "admin.demo@meajudaai.app",
    password: "DemoAdmin2026!",
    nome: "Rafael Nunes",
    papel: "Moderador",
    blurb: "Administração da plataforma — modera denúncias (visualização no modo demo).",
  },
} as const;

export type DemoKey = keyof typeof DEMO_ACCOUNTS;

export const DEMO_EMAILS: ReadonlySet<string> = new Set(
  Object.values(DEMO_ACCOUNTS).map((a) => a.email),
);

export const DEMO_READONLY_MESSAGE =
  "Modo demo · você está vendo dados de exemplo. Crie uma conta para editar.";

export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEMO_EMAILS.has(email.trim().toLowerCase());
}

export function isDemo(user: Pick<CurrentUser, "email"> | null | undefined): boolean {
  return isDemoEmail(user?.email);
}
