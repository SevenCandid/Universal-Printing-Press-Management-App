-- =============================================================================
-- ATTENDANCE TABLE SETUP
-- =============================================================================
-- Copy this entire script and run it in your Supabase SQL Editor
-- (Supabase Dashboard → SQL Editor → New Query → Paste → Run)
-- =============================================================================

-- 1. Create the attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    check_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    check_out TIMESTAMP WITH TIME ZONE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'checked_out', 'absent', 'manual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON public.attendance(check_in DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);

-- 3. Enable Row Level Security
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;

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

-- Optional: Allow CEO and Manager to view all attendance
-- Uncomment this if you have a profiles table with role column
/*
CREATE POLICY "Admins can view all attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('ceo', 'manager')
  )
);
*/

-- 6. Grant permissions
GRANT ALL ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Run this to verify the table was created successfully:

SELECT 
    'attendance' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users
FROM public.attendance;

-- You should see a result with 0 records (if this is a fresh install)
-- If you see an error, the table doesn't exist yet - re-run the script above

-- =============================================================================
-- ✅ DONE!
-- =============================================================================
-- Your attendance table is now ready!
-- Go back to the app and try checking in again.
-- =============================================================================

