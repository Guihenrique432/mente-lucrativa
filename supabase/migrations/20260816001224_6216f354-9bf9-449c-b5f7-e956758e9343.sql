REVOKE EXECUTE ON FUNCTION public.expirar_assinaturas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_movimentacao_estoque() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_lancamento_changes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expirar_assinaturas() TO service_role;