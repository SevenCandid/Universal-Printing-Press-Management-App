-- =============================================================================
-- FIX ATTENDANCE STATUS CONSTRAINT
-- =============================================================================
-- This script fixes the status check constraint error
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- 1. Drop the existing check constraint
ALTER TABLE public.attendance 
DROP CONSTRAINT IF EXISTS attendance_status_check;

-- 2. Add the correct check constraint
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_status_check 
CHECK (status IN ('checked_in', 'checked_out', 'absent', 'manual'));

-- 3. Update any existing records with invalid status values
UPDATE public.attendance 
SET status = 'checked_in' 
WHERE status NOT IN ('checked_in', 'checked_out', 'absent', 'manual');

-- 4. Verify the constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'attendance_status_check';

-- =============================================================================
-- ✅ DONE!
-- =============================================================================
-- The status constraint is now fixed.
-- Valid status values: 'checked_in', 'checked_out', 'absent', 'manual'
-- =============================================================================

