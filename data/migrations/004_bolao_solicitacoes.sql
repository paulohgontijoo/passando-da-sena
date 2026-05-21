BEGIN;

CREATE TABLE public.bolao_solicitacoes (
  id          serial PRIMARY KEY,
  bolao_id    integer     NOT NULL REFERENCES public.boloes(id) ON DELETE CASCADE,
  usuario_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT uq_solicitacao UNIQUE (bolao_id, usuario_id)
);

CREATE INDEX idx_bolao_sol_bolao   ON public.bolao_solicitacoes (bolao_id);
CREATE INDEX idx_bolao_sol_usuario ON public.bolao_solicitacoes (usuario_id);

ALTER TABLE public.bolao_solicitacoes ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ver solicitações (mods precisam ver as pendentes do grupo)
CREATE POLICY sol_select ON public.bolao_solicitacoes
  FOR SELECT TO authenticated USING (true);

-- Usuário insere apenas a própria solicitação
CREATE POLICY sol_insert ON public.bolao_solicitacoes
  FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());

-- Apenas mod do grupo atualiza (aprovar/rejeitar)
CREATE POLICY sol_update ON public.bolao_solicitacoes
  FOR UPDATE TO authenticated USING (public.is_bolao_mod(bolao_id));

-- Usuário pode cancelar a própria, mod pode deletar qualquer uma do grupo
CREATE POLICY sol_delete ON public.bolao_solicitacoes
  FOR DELETE TO authenticated USING (
    usuario_id = auth.uid() OR public.is_bolao_mod(bolao_id)
  );

COMMIT;
