DROP FUNCTION public.gate_begin_verification(text, text);
CREATE FUNCTION public.gate_begin_verification(p_token text, p_binding_hash text)
RETURNS TABLE(verification_id uuid, visitor_id uuid, visitor_number bigint, visitor_label text, initialized boolean)
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

  RETURN QUERY SELECT verification, v.id, v.number,
    coalesce(v.label, 'OUTLAW-VISITOR-' || v.number::text),
    EXISTS (SELECT 1 FROM public.admin_credential);
END;
$$;
REVOKE ALL ON FUNCTION public.gate_begin_verification(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gate_begin_verification(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gate_session_admin(p_verification_id uuid, p_visitor_id uuid, p_binding_hash text)
RETURNS TABLE(admin boolean, visitor_number bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gate_verifications
    WHERE id = p_verification_id
      AND visitor_id = p_visitor_id
      AND session_binding_hash = p_binding_hash
      AND status = 'verified'
      AND access_expires_at > now()
  ),
  (SELECT gv.visitor_number FROM public.gate_verifications gv
    WHERE gv.id = p_verification_id AND gv.visitor_id = p_visitor_id LIMIT 1)
$$;
REVOKE ALL ON FUNCTION public.gate_session_admin(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gate_session_admin(uuid, uuid, text) TO anon, authenticated, service_role;