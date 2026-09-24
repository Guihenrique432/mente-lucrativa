CREATE OR REPLACE FUNCTION public.accept_oauth_invite(
  _token_hash text,
  _user_id uuid,
  _email text,
  _nome text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_row public.invitations%ROWTYPE;
  affected_rows integer;
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT *
  INTO invite_row
  FROM public.invitations
  WHERE token_hash = _token_hash
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.profiles (id, email, nome)
  VALUES (_user_id, _email, _nome)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      nome = COALESCE(EXCLUDED.nome, public.profiles.nome),
      updated_at = now();

  IF invite_row.kind = 'rotating' THEN
    UPDATE public.invitations
    SET uses = COALESCE(uses, 0) + 1,
        used_at = now(),
        used_by = _user_id
    WHERE id = invite_row.id
      AND status = 'pending';
  ELSE
    UPDATE public.invitations
    SET status = 'used',
        used_at = now(),
        used_by = _user_id
    WHERE id = invite_row.id
      AND status = 'pending';
  END IF;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Invite claim failed';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_oauth_invite(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_oauth_invite(text, uuid, text, text) TO service_role;