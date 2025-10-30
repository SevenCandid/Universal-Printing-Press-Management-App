-- =============================================================================
-- ATTENDANCE FIX - ALL ROLES
-- =============================================================================
-- This script ensures all roles (CEO, Manager, Executive Assistant, Board, Staff)
-- have proper permissions for attendance check-in/check-out
-- =============================================================================

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Managers and CEOs can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "CEO and Manager can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Management can view all attendance" ON public.attendance;

-- 2. Create updated policies

-- ✅ Policy 1: ALL users can view their own attendance
CREATE POLICY "Users can view their own attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ✅ Policy 2: Management (CEO, Manager, Executive Assistant) can view all attendance
CREATE POLICY "Management can view all attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ceo', 'manager', 'executive_assistant', 'board')
  )
);

-- ✅ Policy 3: ALL authenticated users can insert their own attendance records (check-in)
CREATE POLICY "Users can insert their own attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ✅ Policy 4: ALL authenticated users can update their own attendance records (check-out)
CREATE POLICY "Users can update their own attendance"
ON public.attendance
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Ensure attendance table has all required columns
-- Check if distance_from_office and gps_accuracy columns exist, add if not
DO $$ 
BEGIN
    -- Add distance_from_office column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance' 
                   AND column_name = 'distance_from_office') THEN
        ALTER TABLE public.attendance ADD COLUMN distance_from_office INTEGER;
        RAISE NOTICE 'Added distance_from_office column';
    END IF;

    -- Add gps_accuracy column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance' 
                   AND column_name = 'gps_accuracy') THEN
        ALTER TABLE public.attendance ADD COLUMN gps_accuracy INTEGER;
        RAISE NOTICE 'Added gps_accuracy column';
    END IF;

    -- Add checkout_distance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance' 
                   AND column_name = 'checkout_distance') THEN
        ALTER TABLE public.attendance ADD COLUMN checkout_distance INTEGER;
        RAISE NOTICE 'Added checkout_distance column';
    END IF;

    -- Add checkout_gps_accuracy column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance' 
                   AND column_name = 'checkout_gps_accuracy') THEN
        ALTER TABLE public.attendance ADD COLUMN checkout_gps_accuracy INTEGER;
        RAISE NOTICE 'Added checkout_gps_accuracy column';
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check all policies for attendance table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'attendance'
ORDER BY policyname;

-- Expected output: You should see 4 policies
-- 1. "Management can view all attendance" - SELECT
-- 2. "Users can insert their own attendance" - INSERT
-- 3. "Users can update their own attendance" - UPDATE
-- 4. "Users can view their own attendance" - SELECT

-- Check attendance table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'attendance'
ORDER BY ordinal_position;

-- =============================================================================
-- TESTING
-- =============================================================================

-- Test: Try to insert a test record (will be visible in console)
-- This should succeed for ANY authenticated user
/*
INSERT INTO public.attendance (
    user_id,
    check_in,
    latitude,
    longitude,
    status,
    distance_from_office,
    gps_accuracy
) VALUES (
    auth.uid(),  -- Current user
    NOW(),
    7.952755,    -- Sample latitude
    -2.698595,   -- Sample longitude
    'checked_in',
    50,          -- 50 meters from office
    20           -- 20 meters GPS accuracy
)
RETURNING *;
*/

-- =============================================================================
-- NOTES
-- =============================================================================

-- These policies ensure:
-- ✅ ALL users (CEO, Manager, Executive Assistant, Board, Staff) can check in/out
-- ✅ Staff users can only view their own attendance
-- ✅ Management roles can view ALL staff attendance
-- ✅ No one can delete attendance records (no DELETE policy)

-- =============================================================================
-- ✅ DONE!
-- =============================================================================
-- All roles should now be able to check in and check out successfully!
-- =============================================================================



