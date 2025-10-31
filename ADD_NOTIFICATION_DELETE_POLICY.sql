-- =====================================================
-- FIX: Add DELETE Policy for Notifications
-- =====================================================
-- This fixes the issue where deleted notifications
-- reappear after logout/login
-- =====================================================

-- Check if DELETE policy exists
DO $$ 
BEGIN 
  RAISE NOTICE '🔧 Adding DELETE policy for notifications...';
END $$;

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Users can delete notifications" ON notifications;

-- Create DELETE policy
CREATE POLICY "Users can delete notifications"
ON notifications
FOR DELETE
TO authenticated
USING (true);

DO $$ 
BEGIN 
  RAISE NOTICE '✅ DELETE policy created successfully!';
  RAISE NOTICE 'Users can now permanently delete notifications';
END $$;

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'notifications' AND cmd = 'DELETE';

