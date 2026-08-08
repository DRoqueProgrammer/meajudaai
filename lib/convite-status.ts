export interface ConviteMin {
  status: string;
  expires_at: string;
}

/**
 * Um convite só pode ser aceito enquanto está 'pendente' e dentro da validade.
 * Função pura (recebe `agora`) para ser testável sem relógio nem banco.
 */
export function podeAceitar(c: ConviteMin, agora: Date): boolean {
  return c.status === "pendente" && new Date(c.expires_at) > agora;
}
