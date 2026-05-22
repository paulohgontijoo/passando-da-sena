BEGIN;

ALTER TABLE public.sorteios
  ADD COLUMN IF NOT EXISTS local_sorteio       text,
  ADD COLUMN IF NOT EXISTS municipio           text,
  ADD COLUMN IF NOT EXISTS uf                  char(2),
  ADD COLUMN IF NOT EXISTS dezenas_ordem       integer[],
  ADD COLUMN IF NOT EXISTS valor_acumulado     numeric(15,2),
  ADD COLUMN IF NOT EXISTS valor_estimado_prox numeric(15,2),
  ADD COLUMN IF NOT EXISTS ganhadores_sena     integer;

-- RPC: frequência de cada dezena no período
CREATE OR REPLACE FUNCTION public.frequencia_dezenas(
  p_ini date DEFAULT '1996-01-01',
  p_fim date DEFAULT CURRENT_DATE
)
RETURNS TABLE(dezena int, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT n::int, COUNT(*) AS total
  FROM   public.sorteios, unnest(numeros) AS n
  WHERE  data_sorteio BETWEEN p_ini AND p_fim
  GROUP  BY n
  ORDER  BY n;
$$;

-- RPC: sorteios com sobreposição >= min_acertos com as dezenas fornecidas
CREATE OR REPLACE FUNCTION public.sorteios_similares(
  p_dezenas integer[],
  p_min     integer DEFAULT 4
)
RETURNS TABLE(
  concurso      integer,
  data_sorteio  date,
  numeros       integer[],
  acumulou      boolean,
  premio_sena   numeric,
  municipio     text,
  uf            char(2),
  local_sorteio text,
  matches       bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT s.concurso, s.data_sorteio, s.numeros, s.acumulou, s.premio_sena,
         s.municipio, s.uf, s.local_sorteio,
         (SELECT COUNT(*) FROM unnest(s.numeros) n WHERE n = ANY(p_dezenas)) AS matches
  FROM   public.sorteios s
  WHERE  s.numeros && p_dezenas
    AND  (SELECT COUNT(*) FROM unnest(s.numeros) n WHERE n = ANY(p_dezenas)) >= p_min
  ORDER  BY matches DESC, s.concurso DESC;
$$;

-- RPC: sazonalidade de acúmulos por mês
CREATE OR REPLACE FUNCTION public.sazonalidade_acumulos()
RETURNS TABLE(mes int, total bigint, acumulados bigint, taxa_acumulo numeric)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    EXTRACT(MONTH FROM data_sorteio)::int AS mes,
    COUNT(*)                              AS total,
    SUM(CASE WHEN acumulou THEN 1 ELSE 0 END) AS acumulados,
    ROUND(
      SUM(CASE WHEN acumulou THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1
    ) AS taxa_acumulo
  FROM  public.sorteios
  GROUP BY mes
  ORDER BY mes;
$$;

-- RPC: mapa — total de sorteios e acumulados por município
CREATE OR REPLACE FUNCTION public.mapa_sorteios()
RETURNS TABLE(municipio text, uf char(2), total bigint, acumulados bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT municipio, uf, COUNT(*) AS total,
         SUM(CASE WHEN acumulou THEN 1 ELSE 0 END) AS acumulados
  FROM   public.sorteios
  WHERE  municipio IS NOT NULL
  GROUP  BY municipio, uf
  ORDER  BY total DESC;
$$;

COMMIT;
