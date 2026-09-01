-- =============================================
-- RODAR ESTE SQL NO SUPABASE SQL EDITOR
-- Historico de processamentos (arquivos ficam no disco do VPS)
-- =============================================

CREATE TABLE processamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- nome do arquivo no volume do servidor, nao um caminho
  arquivo TEXT NOT NULL,
  nome_original TEXT NOT NULL,
  modo TEXT NOT NULL,
  tamanho_bytes BIGINT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  expira_em TIMESTAMPTZ NOT NULL
);

-- Listagem do usuario e da tela do admin
CREATE INDEX idx_processamentos_user ON processamentos(user_id, criado_em DESC);
-- Varredura da limpeza automatica
CREATE INDEX idx_processamentos_expira ON processamentos(expira_em);

ALTER TABLE processamentos ENABLE ROW LEVEL SECURITY;

-- O usuario so enxerga o que e dele. As rotas da API usam a service key, que
-- passa por cima do RLS -- e la a checagem de dono e feita na mao.
CREATE POLICY "Users can view own processamentos"
  ON processamentos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own processamentos"
  ON processamentos FOR DELETE USING (auth.uid() = user_id);
