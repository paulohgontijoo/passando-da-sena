-- ============================================================
-- Migration 002 — Tipo de loteria em ciclos + RPC top numeros
-- ============================================================

BEGIN;

CREATE TYPE public.loteria_tipo AS ENUM (
  'megasena', 'quina', 'lotofacil', 'lotomania', 'timemania', 'dupla_sena'
);

ALTER TABLE public.ciclos
  ADD COLUMN IF NOT EXISTS tipo_loteria public.loteria_tipo NOT NULL DEFAULT 'megasena';

-- RPC para top numeros mais frequentes (usada no formulario de novo ciclo)
CREATE OR REPLACE FUNCTION public.top_numeros_frequentes(n integer DEFAULT 15)
RETURNS TABLE(num integer, freq bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT unnest(numeros) AS num, count(*) AS freq
  FROM public.sorteios
  GROUP BY num
  ORDER BY freq DESC
  LIMIT n;
$$;

GRANT EXECUTE ON FUNCTION public.top_numeros_frequentes TO authenticated;

COMMIT;
