# E-mail transacional (recuperação de senha)

Projeto Supabase: `meajudaai-mvp` · ref `zisvxszjrylnuqplkrlm`

O código já está pronto: `/recuperar-senha` → `resetPasswordForEmail` → `/auth/confirmar`
→ `/nova-senha`. Faltam três ajustes de **configuração**, todos no dashboard do
Supabase, porque envolvem credenciais do seu provedor de e-mail.

---

## Por que não dá para ficar no sender embutido

O SMTP padrão do Supabase é, na documentação deles, **best-effort, sem SLA de
entrega ou uptime, e destinado a uso não-produtivo**. O limite por hora é baixo
e, nas palavras da doc, "pode mudar sem aviso".

Na prática, para o MeAjuda Aí isso significa: com uma dúzia de ajudantes
tentando recuperar a senha na mesma manhã, a maioria não recebe nada — e o app
não tem como avisar, porque a resposta é neutra de propósito (ver abaixo).

---

## 1. SMTP próprio

**Dashboard → Project Settings → Authentication → SMTP Settings → Enable Custom SMTP**

Qualquer provedor serve. Os que têm plano gratuito suficiente para um protótipo:

| Provedor | Host | Porta |
|---|---|---|
| Resend | `smtp.resend.com` | 587 |
| Brevo | `smtp-relay.brevo.com` | 587 |
| SendGrid | `smtp.sendgrid.net` | 587 |

Preencha com as credenciais do provedor. **Sender email precisa ser de um
domínio que você verificou** no provedor — endereço de Gmail/Outlook comum é
recusado ou cai em spam.

> ⚠️ Se o provedor tiver **link tracking**, desligue para os e-mails de auth.
> A doc do Supabase alerta que o rastreamento reescreve a URL e **deforma o
> link de confirmação** — o usuário clica e cai em erro de token inválido.

---

## 2. URLs de redirecionamento

**Dashboard → Authentication → URL Configuration**

Sem isto, o Supabase ignora o `redirectTo` e manda o usuário para a Site URL —
o link chega, o usuário clica, e não vai parar na tela de senha nova.

- **Site URL:** a origem de produção (ex.: `https://meajudaai.com.br`)
- **Redirect URLs** — adicione as duas:
  ```
  http://localhost:3000/auth/confirmar
  https://SEU-DOMINIO/auth/confirmar
  ```

E defina `NEXT_PUBLIC_SITE_URL` no ambiente de produção com a mesma origem.
O código prefere essa variável ao cabeçalho `origin` justamente porque atrás de
proxy/CDN o cabeçalho pode vir errado — e o valor precisa ser previsível para
bater com a allow-list (ver `lib/site-url.ts`).

---

## 3. Template em português

**Dashboard → Authentication → Email Templates → Reset Password**

O template padrão vem em inglês. Sugestão:

**Assunto:** `Criar uma senha nova — MeAjuda Aí`

```html
<h2>Esqueceu a senha?</h2>
<p>Tudo bem, acontece. Clique no botão para criar uma senha nova:</p>
<p><a href="{{ .ConfirmationURL }}">Criar senha nova</a></p>
<p>O link vale por 1 hora e só pode ser usado uma vez.</p>
<p>Se não foi você que pediu, é só ignorar este e-mail — sua senha atual continua valendo.</p>
```

---

## Como saber se está funcionando

A tela **sempre** responde "Se esse e-mail estiver cadastrado, o link já está a
caminho", mesmo para e-mail inexistente. Isso é proposital: confirmar a
existência transformaria o formulário num verificador de quem está na base — e
a base são CPFs de pessoas reais.

Como a tela não denuncia falha, **o diagnóstico vai para o log do servidor**:

```
[auth] falha ao enviar recuperação de senha (status 429): email rate limit exceeded
```

Se "não chega e-mail", é ali que está a resposta — não na interface.
