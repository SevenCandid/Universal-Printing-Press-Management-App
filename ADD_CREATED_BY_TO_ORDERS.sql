-- ============================================================================
-- ADD CREATED_BY TRACKING TO ORDERS TABLE
-- ============================================================================
-- This script adds proper user tracking to orders
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Check if created_by column exists and add if not
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE orders ADD COLUMN created_by UUID REFERENCES profiles(id);
        RAISE NOTICE '✅ Added created_by column';
    ELSE
        -- Column exists, make sure it's the right type
        -- First, backup any text values if they exist
        UPDATE orders SET created_by = NULL WHERE created_by IS NOT NULL AND created_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        -- Change column type if needed
        ALTER TABLE orders ALTER COLUMN created_by TYPE UUID USING created_by::uuid;
        
        -- Add foreign key constraint if not exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'orders' 
            AND constraint_name = 'orders_created_by_fkey'
        ) THEN
            ALTER TABLE orders ADD CONSTRAINT orders_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES profiles(id);
        END IF;
        
        RAISE NOTICE '✅ Updated created_by column to UUID with foreign key';
    END IF;
END $$;

-- 2. Create a view to easily get order details with creator info
CREATE OR REPLACE VIEW orders_with_creator AS
SELECT 
    o.*,
    p.name as creator_name,
    p.email as creator_email,
    p.role as creator_role
FROM orders o
LEFT JOIN profiles p ON o.created_by = p.id;

-- 3. Grant access to the view
GRANT SELECT ON orders_with_creator TO authenticated;

-- 4. Show current structure
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'created_by';

-- 5. Success message
SELECT 
    '✅ Created By tracking added successfully!' as status,
    'Orders now track who created them' as message;

