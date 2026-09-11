REVOKE EXECUTE ON FUNCTION public.gate_ensure_visitor(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gate_admin_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gate_begin_verification(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gate_verify(text, text, text, text, timestamptz) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gate_revoke(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gate_require_admin(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gate_session_admin(uuid, uuid, text) FROM anon, authenticated;