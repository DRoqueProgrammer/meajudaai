import { formatDataExtenso } from "@/lib/format";
import { dataEmSaoPaulo } from "@/lib/datas";

/**
 * Aviso de conta suspensa (migrations 0052/0054), no topo das telas de quem
 * está suspenso — prestador ou cliente. Pedido do Leonardo: "deve ficar claro,
 * escrito em sua página de forma educada, direta, formal, justificando que a
 * plataforma objetiva crescimento local através do encontro de clientes e
 * prestadores de serviços que não ocorreria fora da plataforma". O motivo vem
 * da administração (`suspensoes.motivo_publico`); as suspeitas em si não
 * aparecem aqui.
 */
export function AvisoSuspensao({
  papel,
  motivoPublico,
  suspensoEm,
}: {
  papel: "prestador_servico" | "cliente";
  motivoPublico: string;
  suspensoEm: string;
}) {
  const desde = formatDataExtenso(dataEmSaoPaulo(new Date(suspensoEm)));
  const efeito =
    papel === "prestador_servico"
      ? "seu perfil e seus anúncios não aparecem nas buscas nem na vitrine, e não é possível receber novos agendamentos"
      : "não é possível fazer novos pedidos de serviço";

  return (
    <section
      role="alert"
      aria-labelledby="aviso-suspensao-titulo"
      className="mb-4 rounded-2xl border border-danger/40 bg-tint-danger p-4 text-sm leading-relaxed text-ink sm:p-5"
    >
      <h2 id="aviso-suspensao-titulo" className="text-base font-semibold text-danger">
        Sua conta está suspensa
      </h2>
      <p className="mt-2">
        Desde {desde}, {efeito}. Você continua podendo entrar, ler suas mensagens e acompanhar os serviços já em
        andamento.
      </p>
      <p className="mt-2">
        A Me Ajuda Aí existe para fazer a economia local crescer, promovendo encontros entre clientes e prestadores
        de serviço que dificilmente aconteceriam fora da plataforma. Para que isso continue possível, os serviços
        iniciados aqui — os contatos, os combinados, os pagamentos e a comissão da plataforma — precisam seguir por
        aqui, e não fora da plataforma.
      </p>
      <p className="mt-2">
        <span className="font-semibold">Motivo informado pela administração:</span> {motivoPublico}
      </p>
      <p className="mt-2">
        Se você entende que houve um engano, ou deseja regularizar a situação, fale com a administração da sua praça
        pelas Mensagens. Agradecemos a compreensão.
      </p>
    </section>
  );
}
