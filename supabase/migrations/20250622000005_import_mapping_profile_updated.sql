-- Add Profile Updated On to default import field mapping
UPDATE import_field_mappings
SET mapping = mapping || '{"Profile Updated On": "profile_updated_at"}'::jsonb
WHERE name = 'default_spec_v1' AND is_default = true;
