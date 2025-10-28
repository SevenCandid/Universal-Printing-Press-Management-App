-- ============================================================================
-- SIMPLE FIX FOR ORDERS TABLE - No complex syntax, just adds missing columns
-- ============================================================================
-- Copy and paste this ENTIRE file into Supabase SQL Editor and click RUN
-- ============================================================================

-- Add customer_email column (ignore error if already exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Add payment_method column (ignore error if already exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Add due_date column (ignore error if already exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS due_date DATE;

-- Add notes column (ignore error if already exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add updated_at column (ignore error if already exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update any NULL payment_method values to 'cash'
UPDATE orders 
SET payment_method = 'cash' 
WHERE payment_method IS NULL OR payment_method = '';

-- Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Done! Show success message
SELECT 
    '✅ Orders table updated successfully!' as status,
    'All required columns have been added.' as message;

-- Verify: Show all columns in orders table
SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

