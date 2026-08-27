-- 0020: nota_media ponderada por recência (EWMA), meia-vida ~90 dias.
--
-- A média aritmética simples (0003) tratava uma avaliação de seis meses atrás
-- igual a uma de ontem: um ajudante que era bom e piorou mantinha nota alta por
-- inércia, e a nota é a moeda de confiança do produto. Aqui o peso de cada
-- avaliação decai pela metade a cada 90 dias.
--
-- A referência do decaimento é a avaliação MAIS RECENTE do avaliado, não o
-- relógio de agora. Assim o valor é DETERMINÍSTICO — só muda quando entra ou sai
-- uma avaliação, que é exatamente quando este trigger dispara — em vez de
-- "envelhecer" sozinho entre gravações e ficar dessincronizado do que está no
-- banco. `total_avaliacoes` continua sendo a contagem crua.
--
-- O trigger trg_recompute_nota (0003) já aponta para esta função; basta o
-- CREATE OR REPLACE. Para reverter, reaplique a versão da 0003.

create or replace function public.recompute_nota_media()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_target uuid;
  v_ref timestamptz;
  v_avg numeric;
  v_cnt integer;
  v_meia_vida constant numeric := 90 * 86400; -- 90 dias, em segundos
begin
  v_target := coalesce(new.avaliado_id, old.avaliado_id);

  -- Época de referência = avaliação mais recente do avaliado (peso 1).
  select max(created_at) into v_ref
    from public.avaliacoes where avaliado_id = v_target;

  -- Média ponderada: peso_i = 0.5 ^ (idade_i / meia_vida), idade em segundos
  -- desde a avaliação mais recente. Divisão pela soma dos pesos normaliza.
  select
    round(
      (
        sum(nota * power(0.5, extract(epoch from (v_ref - created_at)) / v_meia_vida))
        / nullif(sum(power(0.5, extract(epoch from (v_ref - created_at)) / v_meia_vida)), 0)
      )::numeric,
      2
    ),
    count(*)
    into v_avg, v_cnt
    from public.avaliacoes where avaliado_id = v_target;

  update public.profiles
    set nota_media = coalesce(v_avg, 0), total_avaliacoes = coalesce(v_cnt, 0)
    where user_id = v_target;
  return null;
end $$;

revoke execute on function public.recompute_nota_media() from anon, authenticated, public;

comment on function public.recompute_nota_media() is
  'Recalcula profiles.nota_media como média ponderada exponencial (EWMA) das avaliações do avaliado: o peso decai pela metade a cada 90 dias, medido a partir da avaliação mais recente (referência determinística). total_avaliacoes é a contagem crua. Dispara a cada insert/update/delete em avaliacoes. SECURITY DEFINER.';
