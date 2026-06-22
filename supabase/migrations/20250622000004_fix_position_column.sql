-- Fix reserved keyword: position -> job_position (column + search trigger)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'alumni_members'
      AND column_name = 'position'
  ) THEN
    ALTER TABLE alumni_members RENAME COLUMN position TO job_position;
  END IF;
END $$;

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
