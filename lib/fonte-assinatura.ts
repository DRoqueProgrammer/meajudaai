import { Dancing_Script } from "next/font/google";

/**
 * Fonte cursiva para a assinatura do Administrador nos recibos quando ele
 * ainda não desenhou a própria (migration 0058, D-047: "sem ela, nome em
 * letra cursiva"). `next/font/google` baixa o arquivo na build e serve do
 * próprio domínio — mesma razão da Poppins em `app/layout.tsx`: sem isso, o
 * navegador de quem abre o recibo pediria fonts.gstatic.com direto, mandando
 * o IP antes de qualquer consentimento. Compartilhada pelas duas páginas de
 * recibo (mensal e nota avulsa) para não duplicar a chamada da fonte.
 */
export const fonteAssinatura = Dancing_Script({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});
