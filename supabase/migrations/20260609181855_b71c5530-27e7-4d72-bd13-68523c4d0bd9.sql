
CREATE TYPE public.tipo_movimentacao AS ENUM ('entrada', 'saida');

CREATE TABLE public.movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo public.tipo_movimentacao NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  observacao text,
  data timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mov_produto ON public.movimentacoes_estoque(produto_id, data DESC);
CREATE INDEX idx_mov_user ON public.movimentacoes_estoque(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO authenticated;
GRANT ALL ON public.movimentacoes_estoque TO service_role;

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movimentacoes: own all"
  ON public.movimentacoes_estoque FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.apply_movimentacao_estoque()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := CASE WHEN NEW.tipo = 'entrada' THEN NEW.quantidade ELSE -NEW.quantidade END;
    UPDATE public.produtos
      SET quantidade = GREATEST(0, quantidade + delta), updated_at = now()
      WHERE id = NEW.produto_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    delta := CASE WHEN OLD.tipo = 'entrada' THEN -OLD.quantidade ELSE OLD.quantidade END;
    UPDATE public.produtos
      SET quantidade = GREATEST(0, quantidade + delta), updated_at = now()
      WHERE id = OLD.produto_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_apply_movimentacao
  AFTER INSERT OR DELETE ON public.movimentacoes_estoque
  FOR EACH ROW EXECUTE FUNCTION public.apply_movimentacao_estoque();
