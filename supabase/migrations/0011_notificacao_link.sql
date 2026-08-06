-- 0011: destino da notificação.
--
-- Os cards de /notificacoes eram becos: "Você foi aceito na diária X" chegava e
-- não levava a lugar nenhum. O `tipo` sozinho só permite adivinhar uma lista;
-- quem cria a notificação sabe exatamente a vaga, então grava o caminho.
--
-- Aditivo e nulo por padrão: linhas antigas continuam válidas e a interface cai
-- num destino por `tipo` quando `link` é null.

alter table public.notificacoes
  add column if not exists link text;

comment on column public.notificacoes.link is
  'Caminho interno para abrir ao tocar na notificação (ex.: /chat/<vaga_id>). Null = usa fallback por tipo.';

-- Índice do contador de não-lidas do rodapé: a consulta é sempre
-- (user_id, visualizada=false), em toda navegação.
create index if not exists notificacoes_nao_vistas_idx
  on public.notificacoes(user_id)
  where visualizada = false;

-- Mesmo caso para o contador de mensagens não lidas.
create index if not exists mensagens_nao_lidas_idx
  on public.mensagens(destinatario_id)
  where lida = false;
