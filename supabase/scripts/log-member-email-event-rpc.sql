-- Copy-paste this entire block into Supabase SQL Editor if migration 000029 is not applied yet.
-- Edge functions call: adminClient.rpc("log_member_email_event", { ... })

CREATE OR REPLACE FUNCTION log_member_email_event(
  p_email_type member_email_type,
  p_provider email_provider,
  p_recipient TEXT,
  p_alumni_member_id UUID DEFAULT NULL,
  p_approval_request_id UUID DEFAULT NULL,
  p_status member_email_status DEFAULT 'triggered',
  p_message_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_trigger_source TEXT DEFAULT 'system'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_recipient TEXT := trim(coalesce(p_recipient, ''));
BEGIN
  IF v_recipient = '' THEN
    RAISE EXCEPTION 'recipient is required';
  END IF;

  INSERT INTO member_email_events (
    alumni_member_id,
    approval_request_id,
    email_type,
    provider,
    recipient,
    status,
    message_id,
    error_message,
    trigger_source
  ) VALUES (
    p_alumni_member_id,
    p_approval_request_id,
    p_email_type,
    p_provider,
    v_recipient,
    p_status,
    p_message_id,
    p_error_message,
    coalesce(nullif(trim(p_trigger_source), ''), 'system')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_member_email_event TO service_role;
