-- =============================================================================
-- ATTENDANCE TABLE - CLEAN SETUP
-- =============================================================================
-- This script completely recreates the attendance table with correct constraints
-- WARNING: This will delete all existing attendance records!
-- If you have important data, backup first or use FIX_ATTENDANCE_STATUS_CONSTRAINT.sql instead
-- =============================================================================

-- 1. Drop existing table (if any)
DROP TABLE IF EXISTS public.attendance CASCADE;

-- 2. Create the attendance table with correct schema
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    check_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    check_out TIMESTAMP WITH TIME ZONE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'checked_in',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- ✅ Correct status constraint
    CONSTRAINT attendance_status_check CHECK (status IN ('checked_in', 'checked_out', 'absent', 'manual'))
);

-- 3. Create indexes for better performance
CREATE INDEX idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX idx_attendance_check_in ON public.attendance(check_in DESC);
CREATE INDEX idx_attendance_status ON public.attendance(status);

-- 4. Enable Row Level Security
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies

-- Users can view their own attendance records
CREATE POLICY "Users can view their own attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own attendance records (check-in)
CREATE POLICY "Users can insert their own attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own attendance records (check-out)
CREATE POLICY "Users can update their own attendance"
ON public.attendance
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Grant permissions
GRANT ALL ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'attendance'
ORDER BY ordinal_position;

-- Check the constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'attendance_status_check';

-- =============================================================================
-- ✅ DONE!
-- =============================================================================
-- Your attendance table is now ready with the correct status constraint!
-- Valid status values: 'checked_in', 'checked_out', 'absent', 'manual'
-- =============================================================================

