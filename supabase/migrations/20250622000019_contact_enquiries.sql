CREATE TYPE contact_enquiry_category AS ENUM (
  'general_enquiry',
  'profile_claim_issue',
  'registration_issue',
  'directory_correction',
  'technical_issue',
  'association_enquiry',
  'media_podcast_enquiry',
  'other'
);

CREATE TABLE contact_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category contact_enquiry_category NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_enquiries_created_at ON contact_enquiries(created_at DESC);

ALTER TABLE contact_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_enquiries_admin_select ON contact_enquiries
  FOR SELECT TO authenticated
  USING (is_admin());
