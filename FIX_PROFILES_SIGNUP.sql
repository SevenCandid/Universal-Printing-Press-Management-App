-- =====================================================
-- FIX: Allow Profile Creation During Signup
-- =====================================================
-- This script fixes issues preventing new user signup
-- 1. Updates role constraint to include new roles
-- 2. Ensures INSERT policy allows profile creation
-- 3. Creates trigger to auto-create profiles (optional)
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '🔧 Fixing profiles table for signup...';
END $$;

-- =====================================================
-- 1. UPDATE PROFILES TABLE ROLE CHECK CONSTRAINT
-- =====================================================
-- Add intern and sales_representative to allowed roles

-- Drop existing constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with all roles including intern and sales_representative
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY[
  'ceo'::text, 
  'board'::text, 
  'manager'::text, 
  'executive_assistant'::text, 
  'staff'::text,
  'intern'::text,
  'sales_representative'::text
]));

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Updated profiles table role constraint with intern and sales_representative';
END $$;

-- =====================================================
-- 2. ENSURE INSERT POLICY ALLOWS PROFILE CREATION
-- =====================================================
-- Allow authenticated users to insert their own profile during signup

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can insert profiles" ON public.profiles;

-- Create INSERT policy allowing authenticated users to create their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only insert their own profile (id matches auth.uid())
  id = auth.uid()
);

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Created INSERT policy for profiles table';
END $$;

-- =====================================================
-- 3. CREATE TRIGGER FUNCTION TO AUTO-CREATE PROFILES
-- =====================================================
-- This automatically creates a profile when a new user signs up
-- It extracts role and other data from user_metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile for new user
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    staff_id,
    is_active,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    NEW.raw_user_meta_data->>'staff_id',
    true,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Don't fail if profile already exists
  
  RETURN NEW;
END;
$$;

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Created handle_new_user trigger function';
END $$;

-- =====================================================
-- 4. CREATE TRIGGER ON auth.users
-- =====================================================
-- Automatically create profile when new user is created

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Created trigger to auto-create profiles';
END $$;

-- =====================================================
-- 5. VERIFY ALL POLICIES AND CONSTRAINTS
-- =====================================================

-- Show role constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND conname = 'profiles_role_check';

-- Show INSERT policies
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
WHERE tablename = 'profiles' AND cmd = 'INSERT'
ORDER BY policyname;

-- Show trigger
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
ORDER BY trigger_name;

DO $$ 
BEGIN 
  RAISE NOTICE '✅ All fixes applied successfully!';
  RAISE NOTICE '✅ Signup should now work for all roles including intern and sales_representative';
END $$;

