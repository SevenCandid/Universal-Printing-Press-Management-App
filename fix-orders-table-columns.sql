-- Fix orders table: Add all missing columns
-- Run this in your Supabase SQL Editor

-- 1. Add customer_email column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'customer_email'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_email TEXT;
        RAISE NOTICE '✓ Added customer_email column';
    ELSE
        RAISE NOTICE '✓ customer_email column already exists';
    END IF;
END $$;

-- 2. Add payment_method column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cash';
        RAISE NOTICE '✓ Added payment_method column';
    ELSE
        RAISE NOTICE '✓ payment_method column already exists';
    END IF;
END $$;

-- 3. Add due_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'due_date'
    ) THEN
        ALTER TABLE orders ADD COLUMN due_date DATE;
        RAISE NOTICE '✓ Added due_date column';
    ELSE
        RAISE NOTICE '✓ due_date column already exists';
    END IF;
END $$;

-- 4. Add notes column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE orders ADD COLUMN notes TEXT;
        RAISE NOTICE '✓ Added notes column';
    ELSE
        RAISE NOTICE '✓ notes column already exists';
    END IF;
END $$;

-- 5. Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✓ Added updated_at column';
    ELSE
        RAISE NOTICE '✓ updated_at column already exists';
    END IF;
END $$;

-- 6. Update any NULL payment_method values to 'cash'
UPDATE orders 
SET payment_method = 'cash' 
WHERE payment_method IS NULL OR payment_method = '';

-- 7. Create or replace trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$ 
BEGIN
    RAISE NOTICE '✓ Created auto-update trigger for updated_at column';
END $$;

-- 8. Verify all columns exist
DO $$ 
DECLARE
    missing_columns TEXT[];
    required_columns TEXT[] := ARRAY[
        'id', 'order_number', 'customer_name', 'customer_phone', 
        'customer_email', 'item_description', 'quantity', 'total_amount',
        'payment_method', 'payment_status', 'order_status', 
        'due_date', 'notes', 'created_by', 'created_at', 'updated_at'
    ];
    col TEXT;
BEGIN
    missing_columns := ARRAY[]::TEXT[];
    
    FOREACH col IN ARRAY required_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'orders' 
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE '⚠️  Missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ All required columns exist in orders table!';
    END IF;
END $$;

-- 9. Show current orders table structure
DO $$ 
BEGIN
    RAISE NOTICE '📋 Current orders table columns:';
END $$;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

