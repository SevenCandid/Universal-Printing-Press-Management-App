-- =============================================================================
-- ATTENDANCE RLS POLICIES UPDATE
-- =============================================================================
-- This script updates Row Level Security policies to allow managers and CEOs
-- to view all staff attendance records while maintaining security for staff
-- =============================================================================

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Managers and CEOs can view all attendance" ON public.attendance;

-- 2. Create updated policies

-- ✅ Policy 1: Users can view their own attendance
CREATE POLICY "Users can view their own attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ✅ Policy 2: Managers and CEOs can view all attendance
CREATE POLICY "Managers and CEOs can view all attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ceo', 'manager')
  )
);

-- ✅ Policy 3: Users can insert their own attendance records (check-in)
CREATE POLICY "Users can insert their own attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ✅ Policy 4: Users can update their own attendance records (check-out)
CREATE POLICY "Users can update their own attendance"
ON public.attendance
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

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
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'attendance'
ORDER BY policyname;

-- Expected output:
-- You should see 4 policies:
-- 1. "Managers and CEOs can view all attendance" - SELECT
-- 2. "Users can insert their own attendance" - INSERT
-- 3. "Users can update their own attendance" - UPDATE
-- 4. "Users can view their own attendance" - SELECT

-- =============================================================================
-- TESTING
-- =============================================================================

-- Test 1: Check if a manager can see all attendance
-- (Run this as a manager/CEO user)
SELECT 
    a.id,
    a.user_id,
    p.name,
    p.role,
    a.check_in,
    a.check_out,
    a.status
FROM attendance a
LEFT JOIN profiles p ON a.user_id = p.id
ORDER BY a.created_at DESC
LIMIT 10;

-- Test 2: Check if a staff member can only see their own attendance
-- (Run this as a staff user)
-- Should only return records where user_id = current user's ID

-- =============================================================================
-- NOTES
-- =============================================================================

-- These policies ensure:
-- ✅ Staff users can only view their own attendance
-- ✅ Staff users can check in/out for themselves only
-- ✅ Managers and CEOs can view ALL staff attendance
-- ✅ Managers and CEOs can check in/out for themselves only
-- ✅ No one can delete attendance records (no DELETE policy)

-- To allow managers to manually add/edit attendance for others, add:
-- CREATE POLICY "Managers can manage all attendance"
-- ON public.attendance
-- FOR ALL
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE profiles.id = auth.uid()
--     AND profiles.role IN ('ceo', 'manager')
--   )
-- );

-- =============================================================================
-- ✅ DONE!
-- =============================================================================
-- Managers and CEOs can now view all staff attendance in the app!
-- The staff filter dropdown will show all staff members for managers/CEOs.
-- =============================================================================

