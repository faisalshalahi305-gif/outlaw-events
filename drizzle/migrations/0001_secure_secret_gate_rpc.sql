CREATE OR REPLACE FUNCTION public.gate_ensure_visitor(p_token text DEFAULT NULL)
RETURNS TABLE(token text, number bigint, label text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v public.visitors%ROWTYPE;
  clean_token text := nullif(left(trim(coalesce(p_token, '')), 200), '');
BEGIN
  IF clean_token IS NOT NULL THEN
    SELECT * INTO v FROM public.visitors WHERE visitors.token = clean_token;
  END IF;

  IF v.id IS NULL THEN
    INSERT INTO public.visitors(token)
    VALUES (gen_random_uuid()::text)
    RETURNING * INTO v;
    UPDATE public.visitors
      SET label = 'OUTLAW-VISITOR-' || v.number::text
      WHERE id = v.id
      RETURNING * INTO v;
  END IF;

  RETURN QUERY SELECT v.token, v.number, coalesce(v.label, 'OUTLAW-VISITOR-' || v.number::text);
END;
$$;
REVOKE ALL ON FUNCTION public.gate_ensure_visitor(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gate_ensure_visitor(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gate_begin_verification(p_token text, p_binding_hash text)
RETURNS TABLE(verification_id uuid, visitor_number bigint, visitor_label text, initialized boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v public.visitors%ROWTYPE;
  verification uuid;
BEGIN
  SELECT * INTO v FROM public.visitors WHERE token = left(trim(coalesce(p_token, '')), 200);
  IF v.id IS NULL THEN RAISE EXCEPTION 'visitor_not_found'; END IF;

  INSERT INTO public.gate_verifications(visitor_id, visitor_number, session_binding_hash, status)
  VALUES (v.id, v.number, p_binding_hash, 'pending')
  RETURNING id INTO verification;

  RETURN QUERY SELECT verification, v.number,
    coalesce(v.label, 'OUTLAW-VISITOR-' || v.number::text),
    EXISTS (SELECT 1 FROM public.admin_credential);
END;
$$;
REVOKE ALL ON FUNCTION public.gate_begin_verification(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gate_begin_verification(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gate_admin_status()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_credential) $$;
REVOKE ALL ON FUNCTION public.gate_admin_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gate_admin_status() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gate_verify(
  p_visitor_token text,
  p_code_hash text,
  p_image_hash text,
  p_access_token_hash text,
  p_access_expires_at timestamptz
)
RETURNS TABLE(ok boolean, created boolean, verification_id uuid, visitor_number bigint, visitor_label text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v public.visitors%ROWTYPE;
  verification uuid;
  credential public.admin_credential%ROWTYPE;
  was_created boolean := false;
BEGIN
  SELECT * INTO v FROM public.visitors WHERE token = left(trim(coalesce(p_visitor_token, '')), 200);
  IF v.id IS NULL THEN RETURN QUERY SELECT false, false, NULL::uuid, NULL::bigint, NULL::text; RETURN; END IF;

  SELECT id INTO verification FROM public.gate_verifications
  WHERE visitor_id = v.id AND status = 'pending'
  ORDER BY entered_at DESC LIMIT 1;
  IF verification IS NULL THEN RETURN QUERY SELECT false, false, NULL::uuid, v.number, v.label; RETURN; END IF;

  PERFORM pg_advisory_xact_lock(7158201);
  SELECT * INTO credential FROM public.admin_credential WHERE id = true;
  IF credential.id IS NULL THEN
    INSERT INTO public.admin_credential(id, code_hash, image_hash)
    VALUES (true, p_code_hash, p_image_hash);
    was_created := true;
  ELSIF credential.code_hash <> p_code_hash OR credential.image_hash <> p_image_hash THEN
    UPDATE public.gate_verifications SET status = 'failed', attempted_at = now() WHERE id = verification;
    RETURN QUERY SELECT false, false, verification, v.number, coalesce(v.label, 'OUTLAW-VISITOR-' || v.number::text);
    RETURN;
  END IF;

  UPDATE public.gate_verifications SET
    status = 'verified', attempted_at = now(), verified_at = now(), last_seen_at = now(),
    access_token_hash = p_access_token_hash, access_expires_at = p_access_expires_at
  WHERE id = verification;

  RETURN QUERY SELECT true, was_created, verification, v.number,
    coalesce(v.label, 'OUTLAW-VISITOR-' || v.number::text);
END;
$$;
REVOKE ALL ON FUNCTION public.gate_verify(text, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gate_verify(text, text, text, text, timestamptz) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gate_revoke(p_access_token_hash text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.gate_verifications
  SET status = 'revoked', access_token_hash = NULL, access_expires_at = NULL
  WHERE access_token_hash = p_access_token_hash
$$;
REVOKE ALL ON FUNCTION public.gate_revoke(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gate_revoke(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gate_require_admin(p_access_token_hash text, p_visitor_token text DEFAULT NULL)
RETURNS TABLE(admin boolean, visitor_number bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  verification public.gate_verifications%ROWTYPE;
  supplied_visitor uuid;
BEGIN
  SELECT * INTO verification FROM public.gate_verifications
  WHERE access_token_hash = p_access_token_hash
    AND status = 'verified'
    AND access_expires_at > now();
  IF verification.id IS NULL THEN RETURN QUERY SELECT false, NULL::bigint; RETURN; END IF;

  IF nullif(trim(coalesce(p_visitor_token, '')), '') IS NOT NULL THEN
    SELECT id INTO supplied_visitor FROM public.visitors WHERE token = left(trim(p_visitor_token), 200);
    IF supplied_visitor IS NULL OR supplied_visitor <> verification.visitor_id THEN
      RETURN QUERY SELECT false, NULL::bigint; RETURN;
    END IF;
  END IF;

  UPDATE public.gate_verifications SET last_seen_at = now() WHERE id = verification.id;
  RETURN QUERY SELECT true, verification.visitor_number;
END;
$$;
REVOKE ALL ON FUNCTION public.gate_require_admin(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gate_require_admin(text, text) TO anon, authenticated, service_role;