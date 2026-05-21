-- ============================================================
-- Migration 002 — Sistema de permissões por grupo (bolao_membros)
-- ============================================================

BEGIN;

-- ── 1. Criar tabela bolao_membros ────────────────────────
CREATE TABLE public.bolao_membros (
  id              serial PRIMARY KEY,
  bolao_id        integer NOT NULL REFERENCES public.boloes(id) ON DELETE CASCADE,
  usuario_id      uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            text    NOT NULL CHECK (role IN ('moderador', 'apostador')) DEFAULT 'apostador',
  adicionado_por  uuid    REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  CONSTRAINT uq_bolao_membro UNIQUE (bolao_id, usuario_id)
);

CREATE INDEX idx_bolao_membros_bolao   ON public.bolao_membros (bolao_id);
CREATE INDEX idx_bolao_membros_usuario ON public.bolao_membros (usuario_id);

-- ── 2. Criar helper APÓS a tabela existir ─────────────────
-- Evita self-reference em RLS; SECURITY DEFINER bypassa RLS no check interno
CREATE OR REPLACE FUNCTION public.is_bolao_mod(check_bolao_id integer)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.bolao_membros
      WHERE bolao_id = check_bolao_id
      AND usuario_id = auth.uid()
      AND role = 'moderador'
    )
$$;

-- ── 3. RLS em bolao_membros ────────────────────────────────
ALTER TABLE public.bolao_membros ENABLE ROW LEVEL SECURITY;

CREATE POLICY bolao_membros_select ON public.bolao_membros
  FOR SELECT TO authenticated USING (true);

CREATE POLICY bolao_membros_insert ON public.bolao_membros
  FOR INSERT TO authenticated WITH CHECK (public.is_bolao_mod(bolao_id));

CREATE POLICY bolao_membros_update ON public.bolao_membros
  FOR UPDATE TO authenticated USING (public.is_bolao_mod(bolao_id));

CREATE POLICY bolao_membros_delete ON public.bolao_membros
  FOR DELETE TO authenticated USING (public.is_bolao_mod(bolao_id));

-- ── 4. Migrar dados: criadores de bolões existentes → mods ─
INSERT INTO public.bolao_membros (bolao_id, usuario_id, role, adicionado_por)
SELECT id, criado_por, 'moderador', criado_por
FROM public.boloes
ON CONFLICT DO NOTHING;

-- ── 5. Trigger: auto-inserir criador como mod ao criar bolão ─
CREATE OR REPLACE FUNCTION public.handle_new_bolao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.bolao_membros (bolao_id, usuario_id, role, adicionado_por)
  VALUES (NEW.id, NEW.criado_por, 'moderador', NEW.criado_por)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_bolao_insert
AFTER INSERT ON public.boloes
FOR EACH ROW EXECUTE FUNCTION public.handle_new_bolao();

-- ── 6. Converter moderadores globais → apostadores ────────
UPDATE public.profiles SET role = 'apostador' WHERE role = 'moderador';

-- ── 7. Atualizar políticas de boloes ──────────────────────
DROP POLICY IF EXISTS boloes_insert ON public.boloes;
CREATE POLICY boloes_insert ON public.boloes
  FOR INSERT TO authenticated WITH CHECK (criado_por = auth.uid());

DROP POLICY IF EXISTS boloes_update ON public.boloes;
CREATE POLICY boloes_update ON public.boloes
  FOR UPDATE TO authenticated USING (public.is_bolao_mod(id));

-- ── 8. Atualizar políticas de ciclos ──────────────────────
DROP POLICY IF EXISTS ciclos_insert ON public.ciclos;
CREATE POLICY ciclos_insert ON public.ciclos
  FOR INSERT TO authenticated WITH CHECK (public.is_bolao_mod(bolao_id));

DROP POLICY IF EXISTS ciclos_update ON public.ciclos;
CREATE POLICY ciclos_update ON public.ciclos
  FOR UPDATE TO authenticated USING (public.is_bolao_mod(bolao_id));

-- ── 9. Atualizar políticas de apostas ────────────────────
DROP POLICY IF EXISTS apostas_insert ON public.apostas;
CREATE POLICY apostas_insert ON public.apostas
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ciclos c
      WHERE c.id = apostas.ciclo_id
      AND public.is_bolao_mod(c.bolao_id)
    )
  );

DROP POLICY IF EXISTS apostas_delete ON public.apostas;
CREATE POLICY apostas_delete ON public.apostas
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.ciclos c
      WHERE c.id = apostas.ciclo_id
      AND public.is_bolao_mod(c.bolao_id)
    )
  );

-- ── 10. Atualizar políticas de participacoes ──────────────
DROP POLICY IF EXISTS participacoes_insert ON public.participacoes;
CREATE POLICY participacoes_insert ON public.participacoes
  FOR INSERT TO authenticated WITH CHECK (
    usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.ciclos c
      WHERE c.id = participacoes.ciclo_id
      AND public.is_bolao_mod(c.bolao_id)
    )
  );

DROP POLICY IF EXISTS participacoes_update ON public.participacoes;
CREATE POLICY participacoes_update ON public.participacoes
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.ciclos c
      WHERE c.id = participacoes.ciclo_id
      AND public.is_bolao_mod(c.bolao_id)
    )
  );

COMMIT;
