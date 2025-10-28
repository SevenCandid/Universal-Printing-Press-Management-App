-- ============================================================================
-- Universal Printing Press - Database Setup for New Features
-- ============================================================================
-- This file contains all SQL scripts needed to set up the new features
-- Run these commands in your Supabase SQL Editor
-- ============================================================================

-- 1️⃣ TOP CUSTOMERS VIEW
-- Creates a view showing top 10 customers by total spending
-- ============================================================================

CREATE OR REPLACE VIEW top_customers AS
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

-- Grant access to authenticated users
GRANT SELECT ON top_customers TO authenticated;

-- ============================================================================

-- 2️⃣ FILE STORAGE POLICIES
-- Set up policies for the order-files storage bucket
-- ============================================================================
-- NOTE: You must first create the 'order-files' bucket in the Supabase Dashboard
-- Storage section before running these policies
-- ============================================================================

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload order files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-files');

-- Policy: Allow authenticated users to read/download files
CREATE POLICY "Authenticated users can view order files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'order-files');

-- Policy: Allow CEO and Manager to delete files
-- Adjust this based on your profiles table structure
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

-- Optional: Policy to allow users to update/replace their uploaded files
CREATE POLICY "Authenticated users can update order files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'order-files')
WITH CHECK (bucket_id = 'order-files');

-- ============================================================================

-- 3️⃣ REALTIME CONFIGURATION
-- Enable realtime for orders and tasks tables
-- ============================================================================
-- NOTE: This should be done via the Supabase Dashboard under Database > Replication
-- Or you can use the following ALTER TABLE commands:
-- ============================================================================

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Enable realtime for tasks table (if you have a tasks table)
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- To verify realtime is enabled, run:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- ============================================================================

-- 4️⃣ OPTIONAL: Create tasks table if it doesn't exist
-- (Skip this if you already have a tasks table)
-- ============================================================================

-- Uncomment if you need to create the tasks table:
/*
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  assigned_to UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tasks assigned to them or created by them
CREATE POLICY "Users can view their tasks"
ON tasks
FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid() OR
  created_by = auth.uid() OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('ceo', 'manager'))
);

-- Policy: CEO and Manager can insert tasks
CREATE POLICY "CEO and Manager can create tasks"
ON tasks
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('ceo', 'manager'))
);

-- Policy: CEO and Manager can update tasks
CREATE POLICY "CEO and Manager can update tasks"
ON tasks
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('ceo', 'manager'))
);

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
*/

-- ============================================================================

-- 5️⃣ VERIFICATION QUERIES
-- Run these to verify everything is set up correctly
-- ============================================================================

-- Check if top_customers view exists and works
SELECT * FROM top_customers;

-- Check storage policies
SELECT * FROM storage.policies WHERE bucket_id = 'order-files';

-- Check realtime publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Check if bucket exists (run in dashboard or via API)
-- SELECT * FROM storage.buckets WHERE name = 'order-files';

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Create 'order-files' bucket in Supabase Dashboard (Storage section)
-- 2. Enable Realtime in Dashboard (Database > Replication)
-- 3. Test the features in your application
-- 4. Grant browser notification permissions when prompted
-- ============================================================================

