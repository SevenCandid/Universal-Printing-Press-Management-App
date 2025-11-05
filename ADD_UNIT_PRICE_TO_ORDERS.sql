-- ============================================================================
-- ADD UNIT_PRICE COLUMN TO ORDERS AND UPDATE VIEW
-- ============================================================================
-- This script adds the unit_price column to orders table and updates the view
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Add unit_price column to orders table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'unit_price'
    ) THEN
        ALTER TABLE orders ADD COLUMN unit_price DECIMAL(10, 2);
        RAISE NOTICE '✅ Added unit_price column to orders table';
    ELSE
        RAISE NOTICE '✅ unit_price column already exists';
    END IF;
END $$;

-- 2. Drop the existing view if it exists
DROP VIEW IF EXISTS orders_with_creator;

-- 3. Recreate the orders_with_creator view to include unit_price
CREATE VIEW orders_with_creator AS
SELECT 
    o.*,
    p.name as creator_name,
    p.email as creator_email,
    p.role as creator_role
FROM orders o
LEFT JOIN profiles p ON o.created_by = p.id;

-- 4. Grant access to the view
GRANT SELECT ON orders_with_creator TO authenticated;

-- 5. Verify the view includes unit_price
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'orders_with_creator' 
  AND column_name = 'unit_price';

-- 6. Success message
SELECT 
    '✅ unit_price column added and view updated!' as status,
    'The orders_with_creator view now includes unit_price' as message;

