-- ============================================================
-- Migration 001 — Reestruturacao completa do schema do bolao
-- Aplicar com: python python/db/migrate.py
-- ============================================================

BEGIN;

-- ── Enums novos ───────────────────────────────────────────
CREATE TYPE public.ciclo_status AS ENUM ('rascunho', 'aberto', 'fechado', 'sorteado');
CREATE TYPE public.participacao_status AS ENUM ('pendente', 'aprovado', 'rejeitado');

-- ── Drop tabelas antigas (ordem por FK) ───────────────────
DROP TABLE IF EXISTS public.participacoes CASCADE;
DROP TABLE IF EXISTS public.apostas CASCADE;
DROP TABLE IF EXISTS public.boloes CASCADE;

-- ── Atualizar profiles ────────────────────────────────────
-- Remove colunas do schema anterior
ALTER TABLE public.profiles DROP COLUMN IF EXISTS nome;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Adiciona nickname e telefone
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone text;

-- Unique constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_nickname_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_nickname_key UNIQUE (nickname);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_telefone_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_telefone_key UNIQUE (telefone);
  END IF;
END $$;

-- NOT NULL (so aplica se a tabela estiver vazia — em producao popular antes)
-- ALTER TABLE public.profiles ALTER COLUMN nickname SET NOT NULL;
-- ALTER TABLE public.profiles ALTER COLUMN telefone SET NOT NULL;

-- Atualizar policy de select (todos autenticados podem ver todos profiles)
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_authenticated
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- Index nickname
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON public.profiles (nickname);

-- ── Nova tabela: boloes ───────────────────────────────────
CREATE TABLE public.boloes (
  id          serial PRIMARY KEY,
  nome        text NOT NULL,
  descricao   text,
  ativo       boolean NOT NULL DEFAULT true,
  criado_por  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.boloes ENABLE ROW LEVEL SECURITY;
CREATE POLICY boloes_select ON public.boloes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY boloes_insert ON public.boloes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderador'))
  );
CREATE POLICY boloes_update ON public.boloes
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderador'))
  );

-- ── Nova tabela: ciclos ───────────────────────────────────
-- valor_cota e calculado automaticamente por trigger
-- valor_devido NAO e armazenado: calcular como num_cotas * ciclo.valor_cota nas queries
CREATE TABLE public.ciclos (
  id                  serial PRIMARY KEY,
  bolao_id            integer NOT NULL REFERENCES public.boloes(id) ON DELETE CASCADE,
  concurso_nr         integer NOT NULL,
  status              public.ciclo_status NOT NULL DEFAULT 'rascunho',
  valor_total_jogado  numeric(10,2) NOT NULL DEFAULT 0,
  valor_cota          numeric(10,2) NOT NULL DEFAULT 0,
  premio_obtido       numeric(10,2),
  criado_por          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at          timestamptz DEFAULT now(),
  fechado_at          timestamptz,
  CONSTRAINT uq_ciclo_bolao_concurso UNIQUE (bolao_id, concurso_nr)
);

CREATE INDEX idx_ciclos_bolao     ON public.ciclos (bolao_id);
CREATE INDEX idx_ciclos_concurso  ON public.ciclos (concurso_nr);

ALTER TABLE public.ciclos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ciclos_select ON public.ciclos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY ciclos_insert ON public.ciclos
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderador'))
  );
CREATE POLICY ciclos_update ON public.ciclos
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderador'))
  );

-- ── Nova tabela: apostas ──────────────────────────────────
CREATE TABLE public.apostas (
  id              serial PRIMARY KEY,
  ciclo_id        integer NOT NULL REFERENCES public.ciclos(id) ON DELETE CASCADE,
  numeros         integer[] NOT NULL CHECK (array_length(numeros, 1) BETWEEN 6 AND 15),
  registrado_por  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_apostas_ciclo ON public.apostas (ciclo_id);

ALTER TABLE public.apostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY apostas_select ON public.apostas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY apostas_insert ON public.apostas
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderador'))
  );
CREATE POLICY apostas_delete ON public.apostas
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderador'))
  );

-- ── Nova tabela: participacoes ────────────────────────────
CREATE TABLE public.participacoes (
  id          serial PRIMARY KEY,
  ciclo_id    integer NOT NULL REFERENCES public.ciclos(id) ON DELETE CASCADE,
  usuario_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status      public.participacao_status NOT NULL DEFAULT 'pendente',
  num_cotas   integer NOT NULL DEFAULT 1 CHECK (num_cotas > 0),
  valor_pago  numeric(10,2) NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  CONSTRAINT uq_participacao_ciclo_usuario UNIQUE (ciclo_id, usuario_id)
);

CREATE INDEX idx_participacoes_ciclo   ON public.participacoes (ciclo_id);
CREATE INDEX idx_participacoes_usuario ON public.participacoes (usuario_id);

ALTER TABLE public.participacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY participacoes_select_own ON public.participacoes
  FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY participacoes_select_mod ON public.participacoes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderador'))
  );
CREATE POLICY participacoes_insert ON public.participacoes
  FOR INSERT TO authenticated WITH CHECK (
    usuario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderador'))
  );
CREATE POLICY participacoes_update ON public.participacoes
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderador'))
  );

-- ── Trigger: recalcular valor_cota quando participacoes mudam ──
CREATE OR REPLACE FUNCTION public.recalcular_valor_cota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ciclo_id          integer;
  v_total_jogado      numeric(10,2);
  v_total_cotas       integer;
  v_novo_valor_cota   numeric(10,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_ciclo_id := OLD.ciclo_id;
  ELSE
    v_ciclo_id := NEW.ciclo_id;
  END IF;

  SELECT valor_total_jogado INTO v_total_jogado
  FROM public.ciclos WHERE id = v_ciclo_id;

  SELECT COALESCE(SUM(num_cotas), 0) INTO v_total_cotas
  FROM public.participacoes
  WHERE ciclo_id = v_ciclo_id AND status = 'aprovado';

  IF v_total_cotas > 0 AND v_total_jogado > 0 THEN
    v_novo_valor_cota := ROUND(v_total_jogado / v_total_cotas, 2);
  ELSE
    v_novo_valor_cota := 0;
  END IF;

  UPDATE public.ciclos
  SET valor_cota = v_novo_valor_cota
  WHERE id = v_ciclo_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Dispara apenas em INSERT, UPDATE de status/num_cotas, DELETE — evita recursao
CREATE TRIGGER recalcular_cota_on_participacao
AFTER INSERT OR UPDATE OF status, num_cotas OR DELETE ON public.participacoes
FOR EACH ROW EXECUTE FUNCTION public.recalcular_valor_cota();

-- ── Trigger: recalcular quando valor_total_jogado muda ───
CREATE OR REPLACE FUNCTION public.recalcular_cota_on_valor_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_cotas integer;
BEGIN
  IF NEW.valor_total_jogado IS DISTINCT FROM OLD.valor_total_jogado THEN
    SELECT COALESCE(SUM(num_cotas), 0) INTO v_total_cotas
    FROM public.participacoes
    WHERE ciclo_id = NEW.id AND status = 'aprovado';

    IF v_total_cotas > 0 AND NEW.valor_total_jogado > 0 THEN
      NEW.valor_cota := ROUND(NEW.valor_total_jogado / v_total_cotas, 2);
    ELSE
      NEW.valor_cota := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER recalcular_cota_on_ciclo
BEFORE UPDATE OF valor_total_jogado ON public.ciclos
FOR EACH ROW EXECUTE FUNCTION public.recalcular_cota_on_valor_update();

-- ── Atualizar trigger de criacao de usuario ───────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, telefone, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'telefone',
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'apostador'::public.user_role
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMIT;
