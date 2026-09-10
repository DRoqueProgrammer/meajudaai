import type { Metadata } from "next";
import { SUPORTE_EMAIL } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Política de Privacidade · Me Ajuda Aí",
  description: "Quais dados o Me Ajuda Aí coleta, para quê, com quem compartilha e como exercer seus direitos.",
};

/**
 * Rota `/privacidade`: Política de Privacidade.
 *
 * Descreve o produto de hoje (v2 — agendamento de serviços, não o mural de
 * vagas da v1): o inventário de dados, os terceiros que os recebem, a base
 * legal por finalidade (art. 7º da LGPD), os prazos de guarda e os direitos
 * do titular (art. 18), incluindo os três botões de "Seus dados" em Perfil.
 * Fatos levantados no código e nas migrations (não é texto genérico de
 * modelo) — ver cvg/brain/refs/2026-09-10-vistoria/pareceres/06-conselheira-protecao-dados.md.
 */
export default function PrivacidadePage() {
  return (
    <article className="legal">
      <h1>Política de Privacidade</h1>
      <p className="meta">Versão 1.0 — 10 de setembro de 2026 · rascunho de protótipo.</p>

      <h2>Em resumo</h2>
      <p>
        O Me Ajuda Aí conecta quem precisa de um serviço a um prestador perto de casa: você busca
        por proximidade e agenda um horário direto na agenda dele. Coletamos o mínimo necessário
        para isso funcionar com segurança. <strong>Seu telefone, seu ponto exato no mapa e sua
        chave Pix nunca aparecem publicamente</strong> — só para a outra parte de um serviço em
        andamento. Não vendemos seus dados.
      </p>

      <h2>1. O que coletamos</h2>
      <ul>
        <li>
          <strong>Cadastro:</strong> nome, e-mail, telefone/WhatsApp, cidade e UF, gênero (com a
          opção “prefiro não responder”), foto de perfil (opcional) e o papel que você escolhe
          (Cliente ou Prestador de Serviço).
        </li>
        <li>
          <strong>Localização:</strong> o ponto exato que você marca no mapa e o endereço escrito
          correspondente. Nenhum dos dois é público — só a própria pessoa, o SysAdmin e a outra
          parte de um serviço <strong>pendente, confirmado ou realizado</strong> com você conseguem
          ver o exato; um serviço cancelado corta esse acesso. Para qualquer outra pessoa, o mapa
          mostra só um ponto aproximado, deslocado em até ~800 metros da posição real.
        </li>
        <li>
          <strong>Chave Pix</strong> do prestador de serviço, para gerar a cobrança de cada
          serviço — sob a mesma regra de visibilidade da localização exata (só a outra parte de um
          serviço válido).
        </li>
        <li>
          <strong>Agenda e serviços:</strong> horários disponíveis, descrição do que foi pedido,
          endereço específico daquele serviço, preço, status (pendente, confirmado, realizado,
          cancelado) e, quando houver cancelamento, o motivo informado.
        </li>
        <li>
          <strong>Avaliações</strong> que você faz ou recebe ao final de um serviço.
        </li>
        <li>
          <strong>Mensagens e notificações</strong> trocadas dentro do app sobre seus agendamentos.
        </li>
        <li>
          <strong>Anotações privadas do prestador</strong> sobre um serviço (ex.: observações que
          ajudam no atendimento seguinte). Ver a base legal e o balanceamento no item 3.
        </li>
        <li>
          <strong>Logs de acesso:</strong> a cada login, registramos IP, navegador (user-agent) e
          uma localização aproximada (cidade/país) derivada do IP.
        </li>
      </ul>

      <h2>2. O que é público e o que não é</h2>
      <p>
        Seu nome, foto, cidade, papel e suas avaliações aparecem no seu perfil, visível a qualquer
        pessoa com conta no app. <strong>Nunca são públicos:</strong> telefone/WhatsApp, e-mail,
        ponto exato no mapa, endereço escrito, chave Pix, anotações privadas do prestador e os
        logs de acesso. Telefone, e-mail, ponto exato e chave Pix ficam visíveis só para a outra
        parte de um serviço pendente, confirmado ou realizado com você — nunca para quem não tem
        esse vínculo, e nunca mais depois que o serviço é cancelado antes de acontecer.
      </p>

      <h2>3. Base legal por finalidade (art. 7º da LGPD)</h2>
      <ul>
        <li>
          <strong>Execução de contrato:</strong> dados de cadastro, agenda e serviços — é o que
          permite a busca por proximidade, o agendamento e a cobrança acontecerem.
        </li>
        <li>
          <strong>Legítimo interesse — segurança:</strong> os logs de acesso (IP, navegador,
          localização aproximada), guardados para detectar uso indevido da conta.
        </li>
        <li>
          <strong>Legítimo interesse — anotações do prestador:</strong> deixamos o prestador
          registrar observações privadas sobre um serviço para ele organizar o próprio trabalho.
          Balanceamos isso com o seu direito de saber o que existe sobre você (art. 18, II): essas
          anotações não aparecem na tela do cliente, mas você pode pedir ao encarregado (item 8)
          para saber se existe alguma registrada sobre você e o teor dela.
        </li>
        <li>
          <strong>Consentimento:</strong> sua foto de perfil — é opcional, e você pode remover ou
          trocar quando quiser em Perfil.
        </li>
        <li>
          <strong>Cumprimento de obrigação legal:</strong> quando a lei exigir guarda ou
          fornecimento de algum dado (ex.: ordem judicial), tratamos com essa base.
        </li>
      </ul>

      <h2>4. Com quem compartilhamos (e para onde seus dados viajam)</h2>
      <p>
        Com a outra parte de um serviço, só o necessário para o serviço acontecer (item 2). Fora
        disso, dados passam pelos seguintes prestadores de serviço técnico (operadores, na
        linguagem da LGPD) — nenhum deles recebe seus dados para vender ou anunciar:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — banco de dados e autenticação. Os servidores ficam nos
          Estados Unidos.
        </li>
        <li>
          <strong>Vercel</strong> — hospedagem do site/app.
        </li>
        <li>
          <strong>OpenStreetMap</strong> — os mapas carregam direto no seu navegador; quando você
          digita um endereço no cadastro, nosso servidor consulta o serviço de busca de endereços
          do OpenStreetMap (Nominatim) para converter o texto em coordenada.
        </li>
        <li>
          <strong>Open-Meteo</strong> — previsão do tempo mostrada na tela inicial. Nosso servidor
          consulta esse serviço só com o nome da sua cidade, nunca com seu IP ou localização exata.
        </li>
        <li>
          <strong>ipapi.co</strong> — a cada login, nosso servidor envia o IP da conexão para esse
          serviço, que devolve uma cidade e país aproximados (é assim que montamos o log de acesso
          do item 1).
        </li>
      </ul>
      <p>
        As fontes de texto do app são servidas pelo próprio Me Ajuda Aí, sem carregar nada do
        Google Fonts.
      </p>
      <p>
        <strong>Transferência internacional (art. 33 da LGPD):</strong> Supabase e ipapi.co operam
        fora do Brasil, então parte dos seus dados — cadastro, agenda e serviços no caso do
        Supabase; o IP de cada login no caso do ipapi.co — trafega para servidores no exterior
        como parte normal de como essas ferramentas funcionam. Isso serve exclusivamente para
        operar o app (guardar e consultar seus dados, e montar o log de acesso) — nunca para venda
        ou repasse a terceiros.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <ul>
        <li>
          <strong>Logs de acesso</strong> (IP, navegador, cidade/país aproximados): 180 dias,
          apagados automaticamente depois disso.
        </li>
        <li>
          <strong>Dados da conta</strong> (cadastro, agenda, serviços, avaliações): enquanto a
          conta existir.
        </li>
        <li>
          <strong>Depois de pedir a exclusão:</strong> seus dados pessoais são anonimizados em até
          15 dias — você tem 7 dias, dentro desse prazo, para desistir e manter a conta. O
          histórico de serviços da outra parte (o prestador ou cliente com quem você tratou)
          continua existindo, só que sem nenhum dado que identifique você.
        </li>
      </ul>

      <h2>6. Seus direitos (art. 18 da LGPD)</h2>
      <p>Em Perfil → “Seus dados”, você encontra três botões:</p>
      <ul>
        <li>
          <strong>Baixar meus dados</strong> — gera um arquivo JSON com todos os seus dados e
          todas as suas atividades na plataforma desde o cadastro.
        </li>
        <li>
          <strong>Excluir meus dados</strong> — inicia a anonimização da sua conta, concluída em
          até 15 dias; você tem 7 dias para desistir.
        </li>
        <li>
          <strong>Desativar conta</strong> — reversível: a conta volta a funcionar normalmente na
          próxima vez que você entrar, depois de confirmar seus dados.
        </li>
      </ul>
      <p>
        Você também pode exercer qualquer um desses direitos (acesso, correção, exclusão,
        portabilidade, informação sobre compartilhamento) escrevendo direto para o encarregado, no
        item 8.
      </p>

      <h2>7. Cookies e armazenamento no navegador</h2>
      <p>
        Usamos só o essencial — nada de publicidade, nada de analytics de terceiros:
      </p>
      <ul>
        <li>O cookie de sessão que mantém você logado.</li>
        <li>Sua preferência de tema claro/escuro.</li>
        <li>O e-mail lembrado, só se você marcar “Lembrar meu e-mail” no login (nunca a senha).</li>
        <li>A lembrança de que você já viu e decidiu sobre o aviso de cookies.</li>
      </ul>

      <h2>8. Encarregado pelo tratamento de dados</h2>
      <p>
        Nesta fase de protótipo, o encarregado (DPO) é o próprio Leonardo Chalhoub. Para exercer
        seus direitos, tirar dúvidas ou relatar algo estranho na sua conta, escreva para{" "}
        <a href={`mailto:${SUPORTE_EMAIL}`}>{SUPORTE_EMAIL}</a>.
      </p>

      <h2>9. Segurança</h2>
      <p>
        Acesso restrito por regra de banco de dados (row-level security) e conexão criptografada.
        Nenhum sistema é 100% seguro — se notar algo estranho na sua conta, conte pra gente na
        hora, pelo contato do item 8.
      </p>

      <h2>10. Mudanças nesta política</h2>
      <p>Podemos atualizar esta política. Quando isso acontecer, avisamos dentro do app.</p>
      <p className="meta">
        Histórico de versões — Versão 1.0 (10 de setembro de 2026): primeira reescrita para o
        produto de agendamento (v2), com inventário completo de dados, terceiros nomeados,
        transferência internacional declarada, prazos de guarda e os três direitos operacionais em
        Perfil → “Seus dados”. Substitui o texto anterior (julho de 2026), que descrevia o mural de
        vagas da v1.
      </p>
    </article>
  );
}
