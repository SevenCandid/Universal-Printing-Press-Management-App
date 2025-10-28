-- =============================================================================
-- EXPENSES SYSTEM - COMPLETE DATABASE SETUP
-- =============================================================================
-- Universal Printing Press (UPP) - Expenses Management System
-- This script creates all necessary tables, RLS policies, and functions
-- =============================================================================

-- =============================================================================
-- 1. EXPENSES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    CONSTRAINT valid_category CHECK (
        category IN (
            'Production',
            'Salaries',
            'Utilities',
            'Rent',
            'Marketing',
            'Equipment',
            'Maintenance',
            'Supplies',
            'Transportation',
            'Other'
        )
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_added_by ON public.expenses(added_by);
CREATE INDEX IF NOT EXISTS idx_expenses_amount ON public.expenses(amount DESC);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "CEO and Manager can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "CEO and Manager can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "CEO and Manager can delete expenses" ON public.expenses;

-- RLS Policies
-- Policy 1: Anyone authenticated can view expenses
CREATE POLICY "Anyone can view expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Only CEO and Manager can insert expenses
CREATE POLICY "CEO and Manager can insert expenses"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'manager')
    )
);

-- Policy 3: Only CEO and Manager can update expenses
CREATE POLICY "CEO and Manager can update expenses"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'manager')
    )
);

-- Policy 4: Only CEO and Manager can delete expenses
CREATE POLICY "CEO and Manager can delete expenses"
ON public.expenses
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'manager')
    )
);

-- Grant permissions
GRANT ALL ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

-- =============================================================================
-- 2. USER DEVICES TABLE (for Push Notifications)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL UNIQUE,
    device_type TEXT NOT NULL CHECK (device_type IN ('web', 'ios', 'android')),
    platform TEXT, -- Browser name, OS, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_token ON public.user_devices(device_token);

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can insert their own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can update their own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can delete their own devices" ON public.user_devices;

-- RLS Policies for user_devices
CREATE POLICY "Users can view their own devices"
ON public.user_devices
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices"
ON public.user_devices
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices"
ON public.user_devices
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
ON public.user_devices
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;

-- =============================================================================
-- 3. UPDATE NOTIFICATIONS TABLE (if it exists)
-- =============================================================================

-- Add additional columns to notifications table if needed
DO $$
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
    END IF;
    
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'priority'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
    END IF;
END $$;

-- =============================================================================
-- 4. TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for expenses updated_at
DROP TRIGGER IF EXISTS set_expenses_updated_at ON public.expenses;
CREATE TRIGGER set_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create notification on large expense
CREATE OR REPLACE FUNCTION public.notify_large_expense()
RETURNS TRIGGER AS $$
DECLARE
    threshold NUMERIC := 1000; -- Default threshold (can be configured)
    user_name TEXT;
BEGIN
    -- Get the user name who added the expense
    SELECT name INTO user_name
    FROM public.profiles
    WHERE id = NEW.added_by;
    
    -- If expense amount exceeds threshold, create notification
    IF NEW.amount >= threshold THEN
        INSERT INTO public.notifications (
            title,
            message,
            type,
            link,
            priority,
            read
        ) VALUES (
            '🚨 Large Expense Alert',
            format('Large expense of ₵%s added: %s by %s', 
                NEW.amount, 
                NEW.title, 
                COALESCE(user_name, 'Unknown')
            ),
            'expense',
            '/expenses',
            'high',
            false
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for large expense notifications
DROP TRIGGER IF EXISTS trigger_large_expense_notification ON public.expenses;
CREATE TRIGGER trigger_large_expense_notification
AFTER INSERT ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.notify_large_expense();

-- =============================================================================
-- 5. HELPER VIEWS
-- =============================================================================

-- View for expense summary by category
CREATE OR REPLACE VIEW public.expense_summary_by_category AS
SELECT 
    category,
    COUNT(*) as expense_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount
FROM public.expenses
GROUP BY category
ORDER BY total_amount DESC;

-- View for monthly expense summary
CREATE OR REPLACE VIEW public.expense_summary_by_month AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as expense_count,
    SUM(amount) as total_amount,
    COUNT(DISTINCT category) as categories_used
FROM public.expenses
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- =============================================================================
-- 6. SEED DATA (Optional - for testing)
-- =============================================================================

-- Uncomment to add sample expenses
/*
INSERT INTO public.expenses (title, amount, category, description, added_by)
VALUES
    ('Office Rent - January', 2500.00, 'Rent', 'Monthly office rent payment', NULL),
    ('Printing Equipment Maintenance', 450.00, 'Maintenance', 'Quarterly maintenance for printers', NULL),
    ('Marketing Campaign', 1200.00, 'Marketing', 'Social media ads for Q1', NULL),
    ('Office Supplies', 85.50, 'Supplies', 'Paper, ink, and stationery', NULL),
    ('Electricity Bill', 320.00, 'Utilities', 'December electricity charges', NULL);
*/

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check tables exist
SELECT 'expenses' as table_name, COUNT(*) as record_count FROM public.expenses
UNION ALL
SELECT 'user_devices', COUNT(*) FROM public.user_devices;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('expenses', 'user_devices')
ORDER BY tablename, policyname;

-- Check expense categories
SELECT DISTINCT category FROM public.expenses ORDER BY category;

-- =============================================================================
-- ✅ SETUP COMPLETE!
-- =============================================================================
-- Your expenses system database is now ready!
-- 
-- Next steps:
-- 1. Configure environment variables (see .env.example)
-- 2. Set up email service (Resend, SendGrid, etc.)
-- 3. Set up push notifications (FCM or OneSignal)
-- 4. Deploy the frontend components
-- =============================================================================

