import type { Metadata } from "next";
import { SUPORTE_EMAIL } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Termos de Uso · Me Ajuda Aí",
  description: "As regras de uso do Me Ajuda Aí — agendamento de serviços entre Cliente e Prestador de Serviço.",
};

/**
 * Rota `/termos`: Termos de Uso.
 *
 * Descreve o produto de hoje (v2 — agendamento de serviços, não o mural de
 * vagas por diária da v1): o que a plataforma faz e não faz, os papéis,
 * agendamento/confirmação/cancelamento, avaliações, conduta, as contas de
 * exemplo (fictícias) e o aviso de protótipo em evolução.
 */
export default function TermosPage() {
  return (
    <article className="legal">
      <h1>Termos de Uso</h1>
      <p className="meta">Versão 1.0 — 10 de setembro de 2026 · rascunho de protótipo.</p>

      <h2>1. O que é o Me Ajuda Aí</h2>
      <p>
        O Me Ajuda Aí conecta quem precisa de um serviço de construção ou manutenção a
        prestadores perto de casa. Cada Prestador de Serviço mantém uma agenda de horários; o
        Cliente busca por proximidade, vê o perfil, escolhe um horário livre e agenda direto — sem
        mural de vagas, sem esperar candidatura. O <strong>serviço em si e o pagamento</strong> —
        inclusive quando feito por Pix — são combinados diretamente entre as duas partes; o Me
        Ajuda Aí <strong>não é empregador, não define o valor do serviço e não processa
        pagamento</strong>. A plataforma apresenta as pessoas e organiza o agendamento.
      </p>

      <h2>2. Quem pode usar</h2>
      <p>
        Você precisa ter 18 anos ou mais e informar dados verdadeiros — nome, e-mail e telefone.
        Uma conta por pessoa. Manter a informação em dia é o que dá confiança para a outra parte
        aceitar o agendamento.
      </p>

      <h2>3. Papéis</h2>
      <p>Na plataforma existem cinco papéis:</p>
      <ul>
        <li>
          <strong>Cliente</strong> — busca prestadores por proximidade e agenda um horário.
        </li>
        <li>
          <strong>Prestador de Serviço</strong> — mantém a própria agenda, recebe e confirma
          pedidos de agendamento.
        </li>
        <li>
          <strong>Administrador</strong> — gerencia a operação de uma praça (uma cidade/instalação
          do Me Ajuda Aí), vinculado pelo SysAdmin.
        </li>
        <li>
          <strong>Funcionário</strong> — papel customizado, convidado por um Administrador, com
          acesso apenas aos módulos liberados para ele.
        </li>
        <li>
          <strong>SysAdmin</strong> — administra a plataforma como um todo, em qualquer praça.
        </li>
      </ul>
      <p>
        No cadastro público, só Cliente e Prestador de Serviço estão disponíveis. Administrador e
        Funcionário nascem por convite de quem já opera a praça.
      </p>

      <h2>4. Agendamento e confirmação</h2>
      <p>
        O Prestador de Serviço define os horários livres na própria agenda. O Cliente escolhe um
        horário, descreve o que precisa e confirma — o horário fica <strong>pendente</strong> até
        o prestador aceitar. Quando ele aceita, nasce o <strong>serviço</strong>, com um preço
        inicial (que pode ser renegociado depois da avaliação no local, mediante aceite do
        Cliente) e um status que evolui entre pendente, confirmado, realizado ou cancelado.
      </p>

      <h2>5. Cancelamento</h2>
      <p>
        Qualquer cancelamento de serviço exige uma justificativa por escrito, registrada com data
        e hora. Cancelar um serviço antes de ele ser realizado também encerra, a partir daquele
        momento, o acesso da outra parte aos seus dados de contato, ponto exato e chave Pix (ver a
        Política de Privacidade).
      </p>

      <h2>6. Avaliações</h2>
      <p>
        Ao final de um serviço, Cliente e Prestador se avaliam mutuamente. Avaliações devem
        refletir a experiência real do serviço prestado — fraudar ou manipular avaliações é motivo
        de suspensão de conta (item 8).
      </p>

      <h2>7. Conduta</h2>
      <ul>
        <li>Sem informação falsa, sem se passar por outra pessoa.</li>
        <li>Sem assédio, ameaça ou discriminação de qualquer tipo.</li>
        <li>Combine o serviço, o valor e a forma de pagamento diretamente com a outra parte.</li>
      </ul>

      <h2>8. Suspensão de conta</h2>
      <p>
        Podemos bloquear contas que quebrem estas regras, tentem fraudar avaliações ou coloquem
        outras pessoas em risco. Nunca excluímos uma conta de forma permanente por moderação — ela
        fica bloqueada; a exclusão de dados pessoais só acontece a seu próprio pedido (ver a
        Política de Privacidade).
      </p>

      <h2>9. Contas de exemplo</h2>
      <p>
        A página inicial oferece um botão de entrada rápida para uma conta de exemplo de cada
        papel, com fins de demonstração. Essas contas são fictícias — e-mail, senha e histórico
        gerados para o protótipo — e cada uma só enxerga e altera dados de outras contas de
        exemplo, nunca de pessoas reais da plataforma.
      </p>

      <h2>10. Protótipo em evolução</h2>
      <p>
        O Me Ajuda Aí está em desenvolvimento ativo. Funcionalidades podem mudar, ser adicionadas
        ou removidas sem aviso prévio enquanto o produto evolui. Fazemos o possível para conectar
        pessoas de confiança, mas não garantimos que um horário será aceito nem respondemos pelo
        serviço executado — use o bom senso ao receber alguém em casa ou entrar num local de
        trabalho.
      </p>

      <h2>11. Lei aplicável e foro</h2>
      <p>
        Estes termos são regidos pela legislação brasileira. Qualquer disputa relacionada a eles
        será resolvida no foro da comarca do domicílio do usuário, conforme a lei permitir.
      </p>

      <h2>12. Mudanças nestes termos</h2>
      <p>Podemos atualizar estes termos. Quando isso acontecer, avisamos dentro do app.</p>

      <h2>13. Falar com a gente</h2>
      <p>
        Dúvida sobre estes termos? Escreva para{" "}
        <a href={`mailto:${SUPORTE_EMAIL}`}>{SUPORTE_EMAIL}</a>.
      </p>

      <p className="meta">
        Histórico de versões — Versão 1.0 (10 de setembro de 2026): primeira reescrita para o
        produto de agendamento (v2) — papéis, agendamento e confirmação, cancelamento com motivo,
        contas de exemplo isoladas e aviso de protótipo em evolução. Substitui o texto anterior
        (julho de 2026), que descrevia o mural de vagas por diária da v1.
      </p>
    </article>
  );
}
