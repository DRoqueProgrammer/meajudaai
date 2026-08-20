import type { Metadata } from "next";
import { SUPORTE_EMAIL } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Política de Privacidade · MeAjuda Aí",
  description: "Quais dados o MeAjuda Aí coleta, para quê, e o que nunca é público.",
};

/** Rota `/privacidade`: Política de Privacidade. */
export default function PrivacidadePage() {
  return (
    <article className="legal">
      <h1>Política de Privacidade</h1>
      <p className="meta">
        Última atualização: julho de 2026 · rascunho de protótipo, revisar com apoio jurídico
        antes do lançamento.
      </p>

      <h2>Em resumo</h2>
      <p>
        Coletamos o mínimo para conectar você a quem precisa de você com segurança.{" "}
        <strong>Seu telefone fica guardado e nunca aparece no seu perfil.</strong> Não vendemos
        seus dados.
      </p>

      <h2>1. O que coletamos</h2>
      <ul>
        <li>Cadastro: nome, e-mail, telefone e cidade.</li>
        <li>O que você publica: vagas, candidaturas, avaliações e mensagens no chat.</li>
        <li>Denúncias que você faz ou recebe.</li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Verificar que você é uma pessoa real — é o que dá o selo de perfil verificado.</li>
        <li>Conectar profissionais e ajudantes e deixar a diária acontecer.</li>
        <li>Segurança e moderação (denúncias, bloqueios).</li>
        <li>Melhorar o app.</li>
      </ul>

      <h2>3. O que é público e o que não é</h2>
      <p>
        Seu nome, cidade, papel e suas avaliações aparecem para o outro lado da diária.{" "}
        <strong>Seu telefone nunca aparece</strong> no seu perfil. Denúncias são anônimas para
        quem é denunciado.
      </p>

      <h2>4. Com quem compartilhamos</h2>
      <p>
        Com a outra parte da diária, só o necessário para vocês se combinarem, e com os provedores
        de infraestrutura que hospedam o app. Nada além disso — e nunca para venda.
      </p>

      <h2>5. Base legal (LGPD)</h2>
      <p>
        Tratamos seus dados para executar o contrato de uso, cumprir obrigações legais e pelo
        legítimo interesse em manter a plataforma segura. Quando a lei exige, pedimos seu
        consentimento.
      </p>

      <h2>6. Seus direitos</h2>
      <p>
        Pela LGPD, você pode acessar, corrigir, excluir e portar seus dados, e saber com quem eles
        foram compartilhados. É só falar com a gente.
      </p>

      <h2>7. Por quanto tempo guardamos</h2>
      <p>
        Enquanto sua conta existir e pelo prazo que a lei exigir. Depois, apagamos ou anonimizamos.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Acesso restrito e conexão criptografada. Nenhum sistema é 100% seguro — se notar algo
        estranho na sua conta, conte pra gente na hora.
      </p>

      <h2>9. Contato do responsável pelos dados</h2>
      <p>
        Para exercer seus direitos ou tirar dúvidas, escreva para{" "}
        <a href={`mailto:${SUPORTE_EMAIL}`}>{SUPORTE_EMAIL}</a>.
      </p>
    </article>
  );
}
