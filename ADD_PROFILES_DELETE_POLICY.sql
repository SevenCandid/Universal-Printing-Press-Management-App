-- =====================================================
-- FIX: Allow Profile Deletion - Update Foreign Keys
-- =====================================================
-- This script fixes foreign key constraints to allow profile deletion
-- Sets ON DELETE behavior to SET NULL or CASCADE where appropriate
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '🔧 Fixing foreign key constraints for profile deletion...';
END $$;

-- =====================================================
-- 1. ORDERS TABLE - Fix created_by foreign key
-- =====================================================

-- Drop existing constraint if it exists
ALTER TABLE IF EXISTS orders 
  DROP CONSTRAINT IF EXISTS orders_created_by_fkey;

-- Recreate with ON DELETE SET NULL
-- This allows profile deletion while preserving orders (created_by becomes NULL)
ALTER TABLE orders 
  ADD CONSTRAINT orders_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Fixed orders_created_by_fkey - ON DELETE SET NULL';
END $$;

-- =====================================================
-- 2. CUSTOMERS TABLE - Fix created_by foreign key
-- =====================================================

-- Drop existing constraint if it exists
ALTER TABLE IF EXISTS customers 
  DROP CONSTRAINT IF EXISTS customers_created_by_fkey;

-- Recreate with ON DELETE SET NULL
ALTER TABLE customers 
  ADD CONSTRAINT customers_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Fixed customers_created_by_fkey - ON DELETE SET NULL';
END $$;

-- =====================================================
-- 3. TASKS TABLE - Fix assigned_to and created_by foreign keys
-- =====================================================

-- Drop existing constraints if they exist
ALTER TABLE IF EXISTS tasks 
  DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

ALTER TABLE IF EXISTS tasks 
  DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

-- Recreate assigned_to with ON DELETE SET NULL
-- This preserves tasks when assigned user is deleted
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_assigned_to_fkey 
  FOREIGN KEY (assigned_to) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

-- Recreate created_by with ON DELETE SET NULL
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Fixed tasks foreign keys - ON DELETE SET NULL';
END $$;

-- =====================================================
-- 4. ADD DELETE Policy for Profiles Table (RLS)
-- =====================================================

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "CEO can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can delete profiles" ON profiles;

-- Create DELETE policy for CEO only
-- CEO can delete any profile (application code prevents deleting CEO role)
CREATE POLICY "CEO can delete profiles"
ON profiles
FOR DELETE
TO authenticated
USING (
  -- User performing delete must be CEO
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'ceo'
  )
);

DO $$ 
BEGIN 
  RAISE NOTICE '✅ DELETE policy created for profiles table';
END $$;

-- =====================================================
-- 5. Verify All Changes
-- =====================================================

-- Show all foreign key constraints referencing profiles
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles'
ORDER BY tc.table_name, tc.constraint_name;

-- Verify DELETE policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'DELETE';

DO $$ 
BEGIN 
  RAISE NOTICE '✅ All foreign key constraints updated successfully!';
  RAISE NOTICE '✅ CEO can now delete user profiles';
  RAISE NOTICE '✅ Related records will have foreign keys set to NULL';
END $$;

