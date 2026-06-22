-- School Alumni App — Phase 1 schema
-- Run in your Supabase SQL editor or via supabase db push

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enums
CREATE TYPE app_role AS ENUM ('alumni', 'admin', 'super_admin');
CREATE TYPE member_status AS ENUM ('pending', 'approved');
CREATE TYPE alumni_status AS ENUM (
  'imported_unclaimed',
  'pending_review',
  'approved',
  'rejected',
  'hidden'
);
CREATE TYPE approval_type AS ENUM ('claim', 'new_registration', 'conflict');
CREATE TYPE approval_status AS ENUM (
  'pending_review',
  'approved',
  'rejected',
  'more_info_required'
);
CREATE TYPE import_row_status AS ENUM ('valid', 'invalid', 'duplicate', 'imported');

-- Profiles (app role layer, linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'alumni',
  member_status member_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alumni members (canonical directory records)
CREATE TABLE alumni_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_number TEXT NOT NULL,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Core identity
  salutation TEXT,
  name TEXT NOT NULL,
  gender TEXT,
  date_of_birth DATE,
  label TEXT,
  email TEXT,
  profile_type TEXT,

  -- Education
  course TEXT,
  stream TEXT,
  course_start_year INT,
  course_end_year INT,
  educational_course TEXT,
  educational_institute TEXT,
  edu_start_year INT,
  edu_end_year INT,
  house TEXT,

  -- Contact
  secondary_email TEXT,
  mobile_phone TEXT,
  home_phone TEXT,
  office_phone TEXT,
  current_location TEXT,
  home_town TEXT,
  correspondence_address TEXT,
  correspondence_city TEXT,
  correspondence_state TEXT,
  correspondence_country TEXT,
  correspondence_pincode TEXT,

  -- Professional
  company TEXT,
  job_position TEXT,
  work_experience_years NUMERIC(4,1),
  professional_skills TEXT,
  industries_worked_in TEXT,
  roles_played TEXT,

  -- Social links
  facebook_link TEXT,
  linkedin_link TEXT,
  twitter_link TEXT,
  website_link TEXT,

  -- Premium (metadata only)
  premium_membership TEXT,
  premium_number TEXT,
  member_roles TEXT,

  -- Profile media
  profile_photo_path TEXT,

  -- Workflow
  status alumni_status NOT NULL DEFAULT 'imported_unclaimed',
  is_directory_visible BOOLEAN NOT NULL DEFAULT true,
  visibility_settings JSONB NOT NULL DEFAULT '{
    "show_email": false,
    "show_phone": false,
    "show_dob": false,
    "show_address": false,
    "show_secondary_email": false,
    "show_social_links": true
  }'::jsonb,

  -- System / audit fields
  registered BOOLEAN DEFAULT false,
  registered_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  profile_updated_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  admin_note TEXT,
  import_batch_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT alumni_members_roll_number_unique UNIQUE (roll_number),
  CONSTRAINT alumni_members_course_years_check CHECK (
    course_start_year IS NULL OR course_end_year IS NULL OR course_start_year <= course_end_year
  )
);

-- Full-text search vector (maintained by trigger)
ALTER TABLE alumni_members ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION alumni_members_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.roll_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.company, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.job_position, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.professional_skills, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.industries_worked_in, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.roles_played, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.house, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.current_location, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.home_town, '')), 'C');
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' AND (
    NEW.name IS DISTINCT FROM OLD.name OR
    NEW.company IS DISTINCT FROM OLD.company OR
    NEW.job_position IS DISTINCT FROM OLD.job_position OR
    NEW.professional_skills IS DISTINCT FROM OLD.professional_skills
  ) THEN
    NEW.profile_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alumni_members_search_vector_trigger
  BEFORE INSERT OR UPDATE ON alumni_members
  FOR EACH ROW EXECUTE FUNCTION alumni_members_search_vector_update();

-- Import batches
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  field_mapping JSONB NOT NULL DEFAULT '{}',
  total_rows INT NOT NULL DEFAULT 0,
  valid_rows INT NOT NULL DEFAULT 0,
  invalid_rows INT NOT NULL DEFAULT 0,
  duplicate_rows INT NOT NULL DEFAULT 0,
  committed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE alumni_members
  ADD CONSTRAINT alumni_members_import_batch_fk
  FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE SET NULL;

-- Imported records (staging)
CREATE TABLE imported_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  raw_payload JSONB NOT NULL,
  validation_errors JSONB,
  row_status import_row_status NOT NULL DEFAULT 'valid',
  alumni_member_id UUID REFERENCES alumni_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Approval requests (unified admin queue)
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type approval_type NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending_review',
  roll_number TEXT NOT NULL,
  submitted_email TEXT NOT NULL,
  submitted_name TEXT,
  submitted_phone TEXT,
  submitted_dob DATE,
  submitted_payload JSONB NOT NULL DEFAULT '{}',
  evidence_path TEXT,
  alumni_member_id UUID REFERENCES alumni_members(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin audit log
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Import field mapping config (maintainable without code changes)
CREATE TABLE import_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  mapping JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_alumni_roll_number ON alumni_members(roll_number);
CREATE INDEX idx_alumni_status_visible ON alumni_members(status, is_directory_visible)
  WHERE status = 'approved' AND is_directory_visible = true;
CREATE INDEX idx_alumni_course ON alumni_members(course);
CREATE INDEX idx_alumni_stream ON alumni_members(stream);
CREATE INDEX idx_alumni_course_end_year ON alumni_members(course_end_year);
CREATE INDEX idx_alumni_location ON alumni_members(current_location);
CREATE INDEX idx_alumni_company ON alumni_members(company);
CREATE INDEX idx_alumni_house ON alumni_members(house);
CREATE INDEX idx_alumni_course_stream_year ON alumni_members(course, stream, course_end_year);
CREATE INDEX idx_alumni_company_location ON alumni_members(company, current_location);
CREATE INDEX idx_alumni_search_vector ON alumni_members USING GIN(search_vector);
CREATE INDEX idx_alumni_user_id ON alumni_members(user_id);
CREATE INDEX idx_approval_status_type ON approval_requests(status, type);
CREATE INDEX idx_approval_roll_number ON approval_requests(roll_number);
CREATE INDEX idx_imported_records_batch ON imported_records(import_batch_id);

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, member_status)
  VALUES (NEW.id, 'alumni', 'pending');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Default import field mapping from spec
INSERT INTO import_field_mappings (name, mapping, is_default) VALUES (
  'default_spec_v1',
  '{
    "Roll no": "roll_number",
    "Name": "name",
    "Salutation": "salutation",
    "Gender": "gender",
    "Date of Birth": "date_of_birth",
    "Label": "label",
    "email_id": "email",
    "Registered": "registered",
    "Registered On": "registered_at",
    "Approved On": "approved_at",
    "Admin Note": "admin_note",
    "Profile Type": "profile_type",
    "Course": "course",
    "Stream": "stream",
    "Course Start Year": "course_start_year",
    "Course End Year": "course_end_year",
    "Secondary Email": "secondary_email",
    "Mobile Phone No.": "mobile_phone",
    "Home Phone No.": "home_phone",
    "Office Phone No.": "office_phone",
    "Current Location": "current_location",
    "Home Town": "home_town",
    "Correspondence Address": "correspondence_address",
    "Correspondence City": "correspondence_city",
    "Correspondence State": "correspondence_state",
    "Correspondence Country": "correspondence_country",
    "Correspondence Pincode": "correspondence_pincode",
    "Company": "company",
    "Position": "job_position",
    "Premium Membership": "premium_membership",
    "Premium Number": "premium_number",
    "Member Roles": "member_roles",
    "Educational Course": "educational_course",
    "Educational Institute": "educational_institute",
    "Start Year": "edu_start_year",
    "End Year": "edu_end_year",
    "Facebook Link": "facebook_link",
    "LinkedIn Link": "linkedin_link",
    "Twitter Link": "twitter_link",
    "Website Link": "website_link",
    "Work Experience(in years)": "work_experience_years",
    "Professional Skills": "professional_skills",
    "Industries Worked In": "industries_worked_in",
    "Roles Played": "roles_played",
    "HOUSE": "house"
  }'::jsonb,
  true
);
