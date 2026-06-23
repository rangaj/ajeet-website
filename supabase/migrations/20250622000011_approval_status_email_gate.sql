-- New approval statuses (must be in their own migration before use elsewhere).

DO $$ BEGIN
  ALTER TYPE approval_status ADD VALUE 'awaiting_email_verification';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE approval_status ADD VALUE 'expired';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
