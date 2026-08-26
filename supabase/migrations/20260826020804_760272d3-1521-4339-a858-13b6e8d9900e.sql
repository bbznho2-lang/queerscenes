
REVOKE EXECUTE ON FUNCTION public.system_notification_sender() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_on_content_comment() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_on_title_request() FROM anon, authenticated, public;
