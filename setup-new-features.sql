-- ============================================================================
-- Universal Printing Press - New Features Database Setup
-- ============================================================================
-- Run these commands in your Supabase SQL Editor
-- ============================================================================

-- 1️⃣ CREATE NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'task', 'file', 'general')),
  link TEXT,
  user_role TEXT DEFAULT 'all', -- 'all', 'ceo', 'manager', 'staff', 'board', or comma-separated like 'ceo,manager'
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

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON notifications(user_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ============================================================================

-- 2️⃣ CREATE COMPANY_FILES STORAGE BUCKET
-- ============================================================================
-- NOTE: You must create the 'company_files' bucket in the Supabase Dashboard
-- Storage section before running these policies
-- ============================================================================

-- Storage Policies for company_files bucket

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload company files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company_files');

-- Policy: Authenticated users can view/download files
CREATE POLICY "Authenticated users can view company files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'company_files');

-- Policy: CEO and Manager can delete files
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

-- Policy: Authenticated users can update files
CREATE POLICY "Authenticated users can update company files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'company_files')
WITH CHECK (bucket_id = 'company_files');

-- ============================================================================

-- 3️⃣ ADD COLUMNS TO ORDERS TABLE (if not already present)
-- ============================================================================

-- Add due_date column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='due_date') THEN
        ALTER TABLE orders ADD COLUMN due_date DATE;
    END IF;
END $$;

-- Add notes column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='notes') THEN
        ALTER TABLE orders ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Add customer_email column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='customer_email') THEN
        ALTER TABLE orders ADD COLUMN customer_email TEXT;
    END IF;
END $$;

-- Add updated_at column with trigger
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='updated_at') THEN
        ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

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

-- 4️⃣ CREATE FUNCTION TO SEND NOTIFICATIONS ON ORDER EVENTS
-- ============================================================================

-- Function to create notification when order is inserted
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

-- 5️⃣ CREATE FUNCTION FOR TASK NOTIFICATIONS (if tasks table exists)
-- ============================================================================

-- Check if tasks table exists and create notification function
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tasks') THEN
        -- Function to create notification when task is assigned
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

        -- Trigger for task assignment
        DROP TRIGGER IF EXISTS task_assigned_notification ON tasks;
        CREATE TRIGGER task_assigned_notification
            AFTER INSERT ON tasks
            FOR EACH ROW
            EXECUTE FUNCTION notify_task_assigned();
    END IF;
END $$;

-- ============================================================================

-- 6️⃣ VERIFICATION QUERIES
-- ============================================================================

-- Check if notifications table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'notifications'
) AS notifications_table_exists;

-- Check storage policies
SELECT * FROM storage.policies WHERE bucket_id IN ('company_files', 'order-files');

-- Check realtime publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%notification%';

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Create 'company_files' bucket in Supabase Dashboard (Storage section)
-- 2. Enable Realtime in Dashboard (Database > Replication) for 'notifications'
-- 3. Set up email service (Resend or Supabase Edge Functions)
-- 4. Test all features in your application
-- ============================================================================

