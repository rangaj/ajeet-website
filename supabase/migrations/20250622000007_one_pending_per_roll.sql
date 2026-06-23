-- One pending approval request per roll number at a time.
-- Reject duplicate pending rows first (keeps earliest submission per roll).

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY roll_number
      ORDER BY created_at ASC
    ) AS rn
  FROM approval_requests
  WHERE status IN ('pending_review', 'more_info_required')
)
UPDATE approval_requests
SET
  status = 'rejected',
  reviewer_note = COALESCE(reviewer_note, 'Duplicate pending request — superseded by earlier submission.'),
  reviewed_at = now(),
  updated_at = now()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_one_pending_per_roll
  ON approval_requests (roll_number)
  WHERE status IN ('pending_review', 'more_info_required');
