-- =============================================================================
-- ATTENDANCE RLS - CEO ONLY CAN VIEW ALL STAFF
-- =============================================================================
-- This script updates Row Level Security policies so that ONLY CEO can view
-- all staff attendance. Managers, Executive Assistants, Board, and Staff
-- can only view their own attendance records.
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

-- ✅ Policy 2: CEO ONLY can view all attendance
CREATE POLICY "CEO can view all attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'ceo'
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
-- 1. "CEO can view all attendance" - SELECT
-- 2. "Users can insert their own attendance" - INSERT
-- 3. "Users can update their own attendance" - UPDATE
-- 4. "Users can view their own attendance" - SELECT

-- =============================================================================
-- NOTES
-- =============================================================================

-- These policies ensure:
-- ✅ ALL users (CEO, Manager, Executive Assistant, Board, Staff) can check in/out
-- ✅ ALL users can view their own attendance records
-- ✅ ONLY CEO can view ALL staff attendance records
-- ✅ Manager, Executive Assistant, Board, and Staff can ONLY see their own records
-- ✅ No one can delete attendance records (no DELETE policy)

-- =============================================================================
-- ✅ DONE!
-- =============================================================================
-- CEO is now the only role that can view all staff attendance!
-- All other roles can only track their own attendance.
-- =============================================================================



