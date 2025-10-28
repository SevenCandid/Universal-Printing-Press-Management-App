-- ============================================================================
-- Universal Printing Press - New Features Database Setup (FIXED VERSION)
-- ============================================================================
-- Run these commands in your Supabase SQL Editor
-- Fixed: Nested function syntax errors and missing columns
-- ============================================================================

-- 1️⃣ CREATE NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'task', 'file', 'general')),
  link TEXT,
  user_role TEXT DEFAULT 'all', -- 'all', 'ceo', 'manager', 'staff', 'board', or comma-separated
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notifications for their role
CREATE POLICY "Users can view notifications for their role"
ON notifications
FOR SELECT
TO authenticated
USING (
  user_role = 'all' OR
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE user_role LIKE '%' || role || '%'
  )
);

-- Policy: Authenticated users can insert notifications
CREATE POLICY "Authenticated users can insert notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Users can update notifications
CREATE POLICY "Users can update notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON notifications(user_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ============================================================================

-- 2️⃣ ADD MISSING COLUMNS TO ORDERS TABLE
-- ============================================================================

-- Add customer_email column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='customer_email') THEN
        ALTER TABLE orders ADD COLUMN customer_email TEXT;
        RAISE NOTICE 'Added customer_email column to orders table';
    ELSE
        RAISE NOTICE 'customer_email column already exists';
    END IF;
END $$;

-- Add due_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='due_date') THEN
        ALTER TABLE orders ADD COLUMN due_date DATE;
        RAISE NOTICE 'Added due_date column to orders table';
    ELSE
        RAISE NOTICE 'due_date column already exists';
    END IF;
END $$;

-- Add notes column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='notes') THEN
        ALTER TABLE orders ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to orders table';
    ELSE
        RAISE NOTICE 'notes column already exists';
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='updated_at') THEN
        ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to orders table';
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;
END $$;

-- ============================================================================

-- 3️⃣ CREATE UPDATE TIMESTAMP TRIGGER
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================

-- 4️⃣ CREATE COMPANY_FILES STORAGE BUCKET POLICIES
-- ============================================================================
-- NOTE: You must first create the 'company_files' bucket in the Supabase Dashboard
-- Storage section before running these policies
-- ============================================================================

-- Policy: Authenticated users can upload files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can upload company files'
    ) THEN
        CREATE POLICY "Authenticated users can upload company files"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'company_files');
        RAISE NOTICE 'Created upload policy for company_files';
    ELSE
        RAISE NOTICE 'Upload policy already exists';
    END IF;
END $$;

-- Policy: Authenticated users can view/download files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can view company files'
    ) THEN
        CREATE POLICY "Authenticated users can view company files"
        ON storage.objects
        FOR SELECT
        TO authenticated
        USING (bucket_id = 'company_files');
        RAISE NOTICE 'Created view policy for company_files';
    ELSE
        RAISE NOTICE 'View policy already exists';
    END IF;
END $$;

-- Policy: CEO and Manager can delete files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'CEO and Manager can delete company files'
    ) THEN
        CREATE POLICY "CEO and Manager can delete company files"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
          bucket_id = 'company_files' AND
          auth.uid() IN (
            SELECT id FROM profiles WHERE role IN ('ceo', 'manager')
          )
        );
        RAISE NOTICE 'Created delete policy for company_files';
    ELSE
        RAISE NOTICE 'Delete policy already exists';
    END IF;
END $$;

-- Policy: Authenticated users can update files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can update company files'
    ) THEN
        CREATE POLICY "Authenticated users can update company files"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = 'company_files')
        WITH CHECK (bucket_id = 'company_files');
        RAISE NOTICE 'Created update policy for company_files';
    ELSE
        RAISE NOTICE 'Update policy already exists';
    END IF;
END $$;

-- ============================================================================

-- 5️⃣ CREATE NOTIFICATION TRIGGER FOR NEW ORDERS
-- ============================================================================

-- Function to create notification when order is created
CREATE OR REPLACE FUNCTION notify_order_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (title, message, type, link, user_role, read)
    VALUES (
        '🧾 New Order Created',
        'Order #' || NEW.order_number || ' - ' || NEW.customer_name,
        'order',
        '/orders',
        'ceo,manager',
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for order creation
DROP TRIGGER IF EXISTS order_created_notification ON orders;
CREATE TRIGGER order_created_notification
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_created();

-- ============================================================================

-- 6️⃣ CREATE NOTIFICATION TRIGGER FOR TASKS (IF TABLE EXISTS)
-- ============================================================================

-- First, create the function (will only be used if tasks table exists)
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (title, message, type, link, user_role, read)
        VALUES (
            '✅ New Task Assigned',
            'Task: ' || COALESCE(NEW.title, 'Untitled'),
            'task',
            '/tasks',
            'all',
            false
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Then, conditionally create the trigger if tasks table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        DROP TRIGGER IF EXISTS task_assigned_notification ON tasks;
        CREATE TRIGGER task_assigned_notification
            AFTER INSERT ON tasks
            FOR EACH ROW
            EXECUTE FUNCTION notify_task_assigned();
        RAISE NOTICE 'Created task notification trigger';
    ELSE
        RAISE NOTICE 'Tasks table does not exist, skipping task trigger';
    END IF;
END $$;

-- ============================================================================

-- 7️⃣ ENABLE REALTIME (OPTIONAL - Manual in Dashboard)
-- ============================================================================

-- Note: If Realtime is not available yet, you can skip this section
-- Manual steps instead:
-- 1. Go to Database → Replication in Supabase Dashboard
-- 2. Enable replication for 'notifications' table
-- 3. Select INSERT and UPDATE events

-- Uncomment below ONLY if you have Realtime enabled:
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================================

-- 8️⃣ VERIFICATION QUERIES
-- ============================================================================

-- Check if notifications table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'notifications'
) AS notifications_table_exists;

-- Check if new columns were added to orders
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('customer_email', 'due_date', 'notes', 'updated_at')
ORDER BY column_name;

-- Check storage policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%company_files%';

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%notification%'
ORDER BY event_object_table, trigger_name;

-- View sample notifications (should be empty initially)
SELECT COUNT(*) as notification_count FROM notifications;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Create 'company_files' bucket in Supabase Dashboard (Storage section)
-- 2. Manually enable Realtime for 'notifications' table (Database > Replication)
--    OR wait for Realtime to be available in your project
-- 3. Set up email service (optional - see EMAIL_SETUP_GUIDE.md)
-- 4. Test all features in your application
-- ============================================================================

