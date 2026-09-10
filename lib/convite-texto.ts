/**
 * Texto do convite por e-mail (R-51, tech-spec fatia-1-seguranca.md) — mora
 * fora de `lib/actions/workspace.ts` porque aquele arquivo é "use server" e
 * só pode exportar funções assíncronas; uma constante como esta precisa de
 * um módulo comum, importável tanto pela action quanto pelo componente
 * cliente (`components/convidar-form.tsx`).
 *
 * A mensagem não confirma nem nega que existe conta com o e-mail digitado
 * (nem se essa conta já estava na equipe): `convidarMembroAction` devolve
 * exatamente este texto nos quatro casos possíveis (sem conta, com conta
 * que acabou de entrar, com conta que já era da equipe, ou bloqueado pela
 * regra do mundo de exemplo) — senão o convite funciona como um oráculo de
 * quem tem conta na plataforma.
 */
export const MENSAGEM_CONVITE_NEUTRA =
  "Se houver uma conta com este e-mail, a pessoa entra na equipe agora e recebe um aviso. Se não houver, peça para ela se cadastrar e convide de novo.";
