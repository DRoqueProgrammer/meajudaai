import type { Metadata } from "next";
import { SUPORTE_EMAIL } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Termos de Uso · MeAjuda Aí",
  description: "As regras de uso do MeAjuda Aí.",
};

/** Rota `/termos`: Termos de Uso. */
export default function TermosPage() {
  return (
    <article className="legal">
      <h1>Termos de Uso</h1>
      <p className="meta">
        Última atualização: julho de 2026 · rascunho de protótipo, revisar com apoio jurídico
        antes do lançamento.
      </p>

      <h2>1. O que é o MeAjuda Aí</h2>
      <p>
        O MeAjuda Aí conecta profissionais autônomos da construção e da manutenção a ajudantes
        para trabalho por diária. Somos a ponte: quem contrata e quem trabalha se encontram aqui e
        combinam o serviço entre si.
      </p>

      <h2>2. Quem pode usar</h2>
      <p>
        Você precisa ter 18 anos ou mais e informar dados verdadeiros — nome, e-mail e telefone. Uma
        conta por pessoa. Manter a informação em dia é o que dá confiança para o outro lado aceitar
        a diária.
      </p>

      <h2>3. Os dois papéis</h2>
      <p>
        Quem <strong>precisa de ajudante</strong> publica vagas e escolhe os candidatos. Quem{" "}
        <strong>quer trabalhar</strong> se candidata às vagas. Dá para trocar de papel enquanto você
        não tiver vaga nem candidatura ativa.
      </p>

      <h2>4. A diária é entre você e a outra pessoa</h2>
      <p>
        O MeAjuda Aí <strong>não é empregador</strong>, não define o valor da diária e não processa
        pagamento. Combinar valor, horário, forma de pagamento e a execução do serviço é
        responsabilidade das partes. A plataforma apenas apresenta as pessoas.
      </p>

      <h2>5. Conduta</h2>
      <ul>
        <li>Sem informação falsa, sem se passar por outra pessoa.</li>
        <li>Sem assédio, ameaça ou discriminação de qualquer tipo.</li>
        <li>Avaliações devem refletir a experiência real de trabalho.</li>
        <li>
          Denúncias são levadas a sério, e quem denuncia <strong>nunca é revelado</strong> para o
          denunciado.
        </li>
      </ul>

      <h2>6. Suspensão de conta</h2>
      <p>
        Podemos bloquear contas que quebrem estas regras, tentem fraudar avaliações ou coloquem
        outras pessoas em risco.
      </p>

      <h2>7. Limites</h2>
      <p>
        Fazemos o possível para conectar pessoas de confiança, mas não garantimos que uma vaga será
        preenchida nem respondemos pelo serviço executado. Use o bom senso ao entrar numa obra ou
        receber alguém — combine tudo pelo chat antes.
      </p>

      <h2>8. Mudanças nestes termos</h2>
      <p>Podemos atualizar estes termos. Quando isso acontecer, avisamos dentro do app.</p>

      <h2>9. Falar com a gente</h2>
      <p>
        Dúvida sobre estes termos? Escreva para{" "}
        <a href={`mailto:${SUPORTE_EMAIL}`}>{SUPORTE_EMAIL}</a>.
      </p>
    </article>
  );
}
