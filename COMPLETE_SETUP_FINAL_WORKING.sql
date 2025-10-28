-- ============================================================================
-- Universal Printing Press - COMPLETE SETUP (FINAL WORKING VERSION)
-- ============================================================================
-- Run this SINGLE file to set up everything!
-- Fixed: All syntax errors, RAISE NOTICE only in DO blocks
-- ============================================================================

-- ============================================================================
-- PART 1: ADD MISSING COLUMNS TO ORDERS TABLE
-- ============================================================================

DO $$ 
BEGIN
    -- Add customer_email column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='customer_email') THEN
        ALTER TABLE orders ADD COLUMN customer_email TEXT;
        RAISE NOTICE '✓ Added customer_email column to orders table';
    ELSE
        RAISE NOTICE '✓ customer_email column already exists';
    END IF;

    -- Add due_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='due_date') THEN
        ALTER TABLE orders ADD COLUMN due_date DATE;
        RAISE NOTICE '✓ Added due_date column to orders table';
    ELSE
        RAISE NOTICE '✓ due_date column already exists';
    END IF;

    -- Add notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='notes') THEN
        ALTER TABLE orders ADD COLUMN notes TEXT;
        RAISE NOTICE '✓ Added notes column to orders table';
    ELSE
        RAISE NOTICE '✓ notes column already exists';
    END IF;

    -- Add payment_method column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='payment_method') THEN
        ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cash';
        RAISE NOTICE '✓ Added payment_method column to orders table';
    ELSE
        RAISE NOTICE '✓ payment_method column already exists';
    END IF;

    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='updated_at') THEN
        ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✓ Added updated_at column to orders table';
    ELSE
        RAISE NOTICE '✓ updated_at column already exists';
    END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE TOP CUSTOMERS VIEW
-- ============================================================================

-- Drop existing view to avoid column order conflicts
DROP VIEW IF EXISTS top_customers CASCADE;

-- Create fresh view with all columns including email
CREATE VIEW top_customers AS
SELECT
  customer_name,
  customer_phone,
  customer_email,
  COUNT(*) AS total_orders,
  SUM(total_amount) AS total_spent
FROM orders
GROUP BY customer_name, customer_phone, customer_email
ORDER BY total_spent DESC
LIMIT 10;

-- Grant access
GRANT SELECT ON top_customers TO authenticated;

-- ============================================================================
-- PART 3: CREATE NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'task', 'file', 'general')),
  link TEXT,
  user_role TEXT DEFAULT 'all',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view notifications for their role" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON notifications;

-- Create policies
CREATE POLICY "Users can view notifications for their role"
ON notifications FOR SELECT TO authenticated
USING (
  user_role = 'all' OR
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE user_role LIKE '%' || role || '%'
  )
);

CREATE POLICY "Authenticated users can insert notifications"
ON notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update notifications"
ON notifications FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON notifications(user_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ============================================================================
-- PART 4: CREATE UPDATE TIMESTAMP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 5: STORAGE POLICIES (order-files bucket)
-- ============================================================================

DO $$
BEGIN
    -- Upload policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can upload order files'
    ) THEN
        CREATE POLICY "Authenticated users can upload order files"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'order-files');
        RAISE NOTICE '✓ Created order-files upload policy';
    ELSE
        RAISE NOTICE '✓ order-files upload policy already exists';
    END IF;

    -- View policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can view order files'
    ) THEN
        CREATE POLICY "Authenticated users can view order files"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'order-files');
        RAISE NOTICE '✓ Created order-files view policy';
    ELSE
        RAISE NOTICE '✓ order-files view policy already exists';
    END IF;

    -- Delete policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'CEO and Manager can delete order files'
    ) THEN
        CREATE POLICY "CEO and Manager can delete order files"
        ON storage.objects FOR DELETE TO authenticated
        USING (
          bucket_id = 'order-files' AND
          auth.uid() IN (SELECT id FROM profiles WHERE role IN ('ceo', 'manager'))
        );
        RAISE NOTICE '✓ Created order-files delete policy';
    ELSE
        RAISE NOTICE '✓ order-files delete policy already exists';
    END IF;

    -- Update policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can update order files'
    ) THEN
        CREATE POLICY "Authenticated users can update order files"
        ON storage.objects FOR UPDATE TO authenticated
        USING (bucket_id = 'order-files')
        WITH CHECK (bucket_id = 'order-files');
        RAISE NOTICE '✓ Created order-files update policy';
    ELSE
        RAISE NOTICE '✓ order-files update policy already exists';
    END IF;
END $$;

-- ============================================================================
-- PART 6: STORAGE POLICIES (company_files bucket)
-- ============================================================================

DO $$
BEGIN
    -- Upload policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can upload company files'
    ) THEN
        CREATE POLICY "Authenticated users can upload company files"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'company_files');
        RAISE NOTICE '✓ Created company_files upload policy';
    ELSE
        RAISE NOTICE '✓ company_files upload policy already exists';
    END IF;

    -- View policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can view company files'
    ) THEN
        CREATE POLICY "Authenticated users can view company files"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'company_files');
        RAISE NOTICE '✓ Created company_files view policy';
    ELSE
        RAISE NOTICE '✓ company_files view policy already exists';
    END IF;

    -- Delete policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'CEO and Manager can delete company files'
    ) THEN
        CREATE POLICY "CEO and Manager can delete company files"
        ON storage.objects FOR DELETE TO authenticated
        USING (
          bucket_id = 'company_files' AND
          auth.uid() IN (SELECT id FROM profiles WHERE role IN ('ceo', 'manager'))
        );
        RAISE NOTICE '✓ Created company_files delete policy';
    ELSE
        RAISE NOTICE '✓ company_files delete policy already exists';
    END IF;

    -- Update policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can update company files'
    ) THEN
        CREATE POLICY "Authenticated users can update company files"
        ON storage.objects FOR UPDATE TO authenticated
        USING (bucket_id = 'company_files')
        WITH CHECK (bucket_id = 'company_files');
        RAISE NOTICE '✓ Created company_files update policy';
    ELSE
        RAISE NOTICE '✓ company_files update policy already exists';
    END IF;
END $$;

-- ============================================================================
-- PART 7: NOTIFICATION TRIGGERS
-- ============================================================================

-- Function for order notifications
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

DROP TRIGGER IF EXISTS order_created_notification ON orders;
CREATE TRIGGER order_created_notification
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_created();

-- Function for task notifications
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

-- Create task trigger if tasks table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        DROP TRIGGER IF EXISTS task_assigned_notification ON tasks;
        CREATE TRIGGER task_assigned_notification
            AFTER INSERT ON tasks
            FOR EACH ROW
            EXECUTE FUNCTION notify_task_assigned();
        RAISE NOTICE '✓ Created task notification trigger';
    ELSE
        RAISE NOTICE 'ℹ Tasks table does not exist, skipping task trigger';
    END IF;
END $$;

-- ============================================================================
-- PART 8: FINAL VERIFICATION AND SUMMARY
-- ============================================================================

DO $$
DECLARE
    v_notification_count INTEGER;
    v_order_count INTEGER;
    v_customer_count INTEGER;
BEGIN
    -- Check notifications
    SELECT COUNT(*) INTO v_notification_count FROM notifications;
    
    -- Check orders
    SELECT COUNT(*) INTO v_order_count FROM orders;
    
    -- Check view
    SELECT COUNT(*) INTO v_customer_count FROM top_customers;
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '                    SETUP COMPLETE! ✓                        ';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Database Status:';
    RAISE NOTICE '  • Orders table: % rows', v_order_count;
    RAISE NOTICE '  • Notifications table: % rows', v_notification_count;
    RAISE NOTICE '  • Top Customers view: % customers', v_customer_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Create storage buckets in Supabase Dashboard:';
    RAISE NOTICE '     → Storage → New Bucket → "order-files" (Private)';
    RAISE NOTICE '     → Storage → New Bucket → "company_files" (Private)';
    RAISE NOTICE '';
    RAISE NOTICE '  2. Enable Realtime (optional, when available):';
    RAISE NOTICE '     → Database → Replication → Enable "notifications"';
    RAISE NOTICE '';
    RAISE NOTICE '  3. Configure email alerts (optional):';
    RAISE NOTICE '     → See EMAIL_SETUP_GUIDE.md';
    RAISE NOTICE '';
    RAISE NOTICE '  4. Test your application:';
    RAISE NOTICE '     → Visit: http://localhost:3000/ceo/orders';
    RAISE NOTICE '     → Click "Edit" and "Delete" buttons';
    RAISE NOTICE '     → Visit: http://localhost:3000/ceo/files';
    RAISE NOTICE '     → Upload and manage files';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE 'All database objects created successfully!';
    RAISE NOTICE 'Ready to use all 4 new features.';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

