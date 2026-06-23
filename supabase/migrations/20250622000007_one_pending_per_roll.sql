-- One pending approval request per roll number at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_one_pending_per_roll
  ON approval_requests (roll_number)
  WHERE status IN ('pending_review', 'more_info_required');
