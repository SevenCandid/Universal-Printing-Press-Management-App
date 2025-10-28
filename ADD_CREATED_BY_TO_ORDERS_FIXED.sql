-- ============================================================================
-- ADD CREATED_BY TRACKING TO ORDERS TABLE (FIXED VERSION)
-- ============================================================================
-- This script adds proper user tracking to orders
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Check if created_by column exists and ensure it's UUID type
DO $$ 
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'created_by'
    ) THEN
        -- Column doesn't exist, create it as UUID
        ALTER TABLE orders ADD COLUMN created_by UUID;
        RAISE NOTICE '✅ Added created_by column as UUID';
    ELSE
        -- Column exists, check its type
        DECLARE
            current_type text;
        BEGIN
            SELECT data_type INTO current_type
            FROM information_schema.columns
            WHERE table_name = 'orders' AND column_name = 'created_by';
            
            IF current_type = 'uuid' THEN
                RAISE NOTICE '✅ created_by column already exists as UUID';
            ELSIF current_type = 'text' OR current_type = 'character varying' THEN
                -- It's text, need to convert to UUID
                RAISE NOTICE '⚠️  Converting created_by from % to UUID...', current_type;
                
                -- First, set invalid UUIDs to NULL
                UPDATE orders 
                SET created_by = NULL 
                WHERE created_by IS NOT NULL 
                AND created_by::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
                
                -- Now convert the column type
                ALTER TABLE orders ALTER COLUMN created_by TYPE UUID USING created_by::uuid;
                
                RAISE NOTICE '✅ Converted created_by to UUID';
            ELSE
                RAISE NOTICE '⚠️  created_by has unexpected type: %', current_type;
            END IF;
        END;
    END IF;
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'orders' 
        AND constraint_name = 'orders_created_by_fkey'
    ) THEN
        -- Check if profiles table exists first
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
            ALTER TABLE orders 
            ADD CONSTRAINT orders_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
            
            RAISE NOTICE '✅ Added foreign key constraint to profiles';
        ELSE
            RAISE NOTICE '⚠️  profiles table does not exist, skipping foreign key';
        END IF;
    ELSE
        RAISE NOTICE '✅ Foreign key constraint already exists';
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

-- 5. Count orders with and without creator
SELECT 
    COUNT(*) FILTER (WHERE created_by IS NOT NULL) as orders_with_creator,
    COUNT(*) FILTER (WHERE created_by IS NULL) as orders_without_creator,
    COUNT(*) as total_orders
FROM orders;

-- 6. Success message
SELECT 
    '✅ Created By tracking setup complete!' as status,
    'Orders now track who created them' as message;

