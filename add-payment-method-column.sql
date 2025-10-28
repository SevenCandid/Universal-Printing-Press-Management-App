-- Add payment_method column to orders table if it doesn't exist
-- This will fix the issue where payment_method displays payment amount

-- Check if column exists and add it if needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cash';
        RAISE NOTICE '✓ Added payment_method column to orders table';
    ELSE
        RAISE NOTICE '✓ payment_method column already exists';
    END IF;
END $$;

-- Update any NULL payment_method values to 'cash'
UPDATE orders 
SET payment_method = 'cash' 
WHERE payment_method IS NULL OR payment_method = '';

-- Optional: Fix any records where payment_method might contain numeric values (if data was corrupted)
UPDATE orders 
SET payment_method = 'cash' 
WHERE payment_method ~ '^[0-9.]+$';

DO $$ 
BEGIN
    RAISE NOTICE '✓ Updated all NULL or invalid payment_method values to default (cash)';
END $$;

