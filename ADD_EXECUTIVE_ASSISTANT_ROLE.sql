-- =============================================================================
-- ADD EXECUTIVE ASSISTANT ROLE - COMPLETE DATABASE SETUP
-- =============================================================================
-- Universal Printing Press (UPP) - Add Executive Assistant with Manager Permissions
-- =============================================================================

-- =============================================================================
-- 1. UPDATE PROFILES TABLE ROLE CHECK
-- =============================================================================

-- Drop existing constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with executive_assistant
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['ceo'::text, 'board'::text, 'manager'::text, 'executive_assistant'::text, 'staff'::text]));

DO $$ BEGIN RAISE NOTICE '✓ Updated profiles table role constraint'; END $$;

-- =============================================================================
-- 2. UPDATE EXPENSES TABLE RLS POLICIES
-- =============================================================================

-- Drop and recreate insert policy
DROP POLICY IF EXISTS "CEO and Manager can insert expenses" ON public.expenses;
CREATE POLICY "CEO, Manager and Executive Assistant can insert expenses"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
    )
);

-- Drop and recreate update policy
DROP POLICY IF EXISTS "CEO and Manager can update expenses" ON public.expenses;
CREATE POLICY "CEO, Manager and Executive Assistant can update expenses"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
    )
);

-- Drop and recreate delete policy
DROP POLICY IF EXISTS "CEO and Manager can delete expenses" ON public.expenses;
CREATE POLICY "CEO, Manager and Executive Assistant can delete expenses"
ON public.expenses
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
    )
);

DO $$ BEGIN RAISE NOTICE '✓ Updated expenses RLS policies'; END $$;

-- =============================================================================
-- 3. UPDATE CUSTOMERS TABLE RLS POLICIES
-- =============================================================================

-- Drop and recreate insert policy
DROP POLICY IF EXISTS "CEO and Manager can insert customers" ON public.customers;
CREATE POLICY "CEO, Manager and Executive Assistant can insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('ceo', 'manager', 'executive_assistant')
    )
);

-- Drop and recreate update policy
DROP POLICY IF EXISTS "CEO and Manager can update customers" ON public.customers;
CREATE POLICY "CEO, Manager and Executive Assistant can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('ceo', 'manager', 'executive_assistant')
    )
);

-- Drop and recreate delete policy
DROP POLICY IF EXISTS "CEO and Manager can delete customers" ON public.customers;
CREATE POLICY "CEO, Manager and Executive Assistant can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('ceo', 'manager', 'executive_assistant')
    )
);

DO $$ BEGIN RAISE NOTICE '✓ Updated customers RLS policies'; END $$;

-- =============================================================================
-- 4. UPDATE ORDERS TABLE RLS POLICIES
-- =============================================================================

-- Check if orders table has specific manager policies and update them
DO $$
BEGIN
    -- Update any order-related policies that reference manager
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname LIKE '%manager%'
    ) THEN
        -- Drop and recreate policies (adjust based on your actual policies)
        DROP POLICY IF EXISTS "Managers can update orders" ON public.orders;
        DROP POLICY IF EXISTS "Managers can delete orders" ON public.orders;
        
        -- Recreate with executive_assistant
        CREATE POLICY "Managers and Executive Assistants can update orders"
        ON public.orders
        FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
            )
        );
        
        CREATE POLICY "Managers and Executive Assistants can delete orders"
        ON public.orders
        FOR DELETE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
            )
        );
        
        RAISE NOTICE '✓ Updated orders RLS policies';
    END IF;
END $$;

-- =============================================================================
-- 5. UPDATE TASKS TABLE RLS POLICIES
-- =============================================================================

-- Check and update tasks policies
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tasks' 
        AND policyname LIKE '%manager%'
    ) THEN
        DROP POLICY IF EXISTS "Managers can assign tasks" ON public.tasks;
        DROP POLICY IF EXISTS "Managers can update all tasks" ON public.tasks;
        
        CREATE POLICY "Managers and Executive Assistants can assign tasks"
        ON public.tasks
        FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
            )
        );
        
        CREATE POLICY "Managers and Executive Assistants can update all tasks"
        ON public.tasks
        FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
            )
        );
        
        RAISE NOTICE '✓ Updated tasks RLS policies';
    END IF;
END $$;

-- =============================================================================
-- 6. UPDATE ATTENDANCE TABLE RLS POLICIES
-- =============================================================================

-- Drop and recreate view all attendance policy
DROP POLICY IF EXISTS "Managers and CEOs can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "CEOs, Managers and Executive Assistants can view all attendance" ON public.attendance;

CREATE POLICY "CEOs, Managers and Executive Assistants can view all attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
    )
);

DO $$ BEGIN RAISE NOTICE '✓ Updated attendance RLS policies'; END $$;

-- =============================================================================
-- 7. UPDATE FILES/STORAGE POLICIES (if they exist)
-- =============================================================================

-- Note: Storage policies might need to be updated in Supabase Storage UI
-- This is a reminder to update them manually if needed

DO $$ BEGIN RAISE NOTICE '⚠ Remember to update Storage bucket policies in Supabase UI'; END $$;

-- =============================================================================
-- 8. UPDATE ANY CUSTOM FUNCTIONS THAT CHECK ROLES
-- =============================================================================

-- Update get_staff_performance function if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'get_staff_performance'
    ) THEN
        -- This might need manual adjustment based on your function logic
        RAISE NOTICE '⚠ Check get_staff_performance function for role logic';
    END IF;
END $$;

-- =============================================================================
-- 9. VERIFICATION
-- =============================================================================

-- Verify the role constraint
DO $$
DECLARE
    constraint_def TEXT;
BEGIN
    SELECT pg_get_constraintdef(oid) INTO constraint_def
    FROM pg_constraint
    WHERE conname = 'profiles_role_check';
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Constraint Definition:';
    RAISE NOTICE '%', constraint_def;
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- List all updated policies
DO $$
DECLARE
    policy_record RECORD;
    policy_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Updated RLS Policies:';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    
    FOR policy_record IN
        SELECT 
            tablename,
            policyname,
            cmd
        FROM pg_policies
        WHERE (
            policyname LIKE '%Executive Assistant%' 
            OR policyname LIKE '%executive_assistant%'
            OR qual::text LIKE '%executive_assistant%'
            OR with_check::text LIKE '%executive_assistant%'
        )
        ORDER BY tablename, policyname
    LOOP
        RAISE NOTICE '  • % - % (%)', policy_record.tablename, policy_record.policyname, policy_record.cmd;
        policy_count := policy_count + 1;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Total policies updated: %', policy_count;
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- =============================================================================
-- 10. SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✓ Executive Assistant Role Added Successfully!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Updated:';
    RAISE NOTICE '  ✓ profiles table role constraint';
    RAISE NOTICE '  ✓ expenses RLS policies';
    RAISE NOTICE '  ✓ customers RLS policies';
    RAISE NOTICE '  ✓ orders RLS policies (if exist)';
    RAISE NOTICE '  ✓ tasks RLS policies (if exist)';
    RAISE NOTICE '  ✓ attendance RLS policies';
    RAISE NOTICE '';
    RAISE NOTICE 'Executive Assistant now has Manager-level permissions!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Update frontend role checks';
    RAISE NOTICE '  2. Add Executive Assistant pages';
    RAISE NOTICE '  3. Update signup form';
    RAISE NOTICE '  4. Test all permissions';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;
