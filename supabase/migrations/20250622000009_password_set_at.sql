-- Track when a user has chosen a password (OTP/magic-link accounts start without one).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.password_set_at IS
  'Set when the user completes password setup or reset via updateUser.';
