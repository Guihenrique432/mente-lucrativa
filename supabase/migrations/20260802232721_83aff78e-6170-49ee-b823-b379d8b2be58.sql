REVOKE ALL ON FUNCTION public.expirar_assinaturas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expirar_assinaturas() TO postgres, service_role;