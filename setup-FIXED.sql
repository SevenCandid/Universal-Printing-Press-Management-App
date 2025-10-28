-- ============================================================================
-- Universal Printing Press - Previous Features Setup (FIXED VERSION)
-- ============================================================================
-- This file contains SQL for the top_customers view and order-files storage
-- Fixed: Removed customer_email reference (column doesn't exist yet)
-- ============================================================================

-- 1️⃣ TOP CUSTOMERS VIEW (FIXED)
-- ============================================================================

-- Create view WITHOUT customer_email (will add later)
CREATE OR REPLACE VIEW top_customers AS
SELECT
  customer_name,
  customer_phone,
  COUNT(*) AS total_orders,
  SUM(total_amount) AS total_spent
FROM orders
GROUP BY customer_name, customer_phone
ORDER BY total_spent DESC
LIMIT 10;

-- Grant access to authenticated users
GRANT SELECT ON top_customers TO authenticated;

-- ============================================================================

-- 2️⃣ FILE STORAGE POLICIES (order-files bucket)
-- ============================================================================
-- NOTE: Create 'order-files' bucket in Supabase Dashboard first
-- ============================================================================

-- Policy: Allow authenticated users to upload files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can upload order files'
    ) THEN
        CREATE POLICY "Authenticated users can upload order files"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'order-files');
    END IF;
END $$;

-- Policy: Allow authenticated users to read/download files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can view order files'
    ) THEN
        CREATE POLICY "Authenticated users can view order files"
        ON storage.objects
        FOR SELECT
        TO authenticated
        USING (bucket_id = 'order-files');
    END IF;
END $$;

-- Policy: Allow CEO and Manager to delete files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'CEO and Manager can delete order files'
    ) THEN
        CREATE POLICY "CEO and Manager can delete order files"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
          bucket_id = 'order-files' AND
          auth.uid() IN (
            SELECT id FROM profiles WHERE role IN ('ceo', 'manager')
          )
        );
    END IF;
END $$;

-- Policy: Allow authenticated users to update/replace files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can update order files'
    ) THEN
        CREATE POLICY "Authenticated users can update order files"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = 'order-files')
        WITH CHECK (bucket_id = 'order-files');
    END IF;
END $$;

-- ============================================================================

-- 3️⃣ ENABLE REALTIME (OPTIONAL - if available)
-- ============================================================================

-- Uncomment when Realtime is available in your project:
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- ============================================================================

-- 4️⃣ VERIFICATION QUERIES
-- ============================================================================

-- Check if top_customers view exists and works
SELECT * FROM top_customers LIMIT 5;

-- Check storage policies
SELECT policyname 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%order-files%';

-- ============================================================================
-- NOTES:
-- - Run setup-new-features-FIXED.sql AFTER this file
-- - That will add customer_email column and update the view
-- - Create 'order-files' bucket in Storage before testing file uploads
-- ============================================================================

