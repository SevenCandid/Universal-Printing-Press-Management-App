-- ============================================================================
-- Other Customers Feature - Database Setup
-- ============================================================================
-- Creates customers table for manually managed customers
-- ============================================================================

-- 1️⃣ CREATE CUSTOMERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  category TEXT DEFAULT 'other' CHECK (category IN ('top', 'other')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view customers" ON customers;
DROP POLICY IF EXISTS "CEO and Manager can insert customers" ON customers;
DROP POLICY IF EXISTS "CEO and Manager can update customers" ON customers;
DROP POLICY IF EXISTS "CEO and Manager can delete customers" ON customers;

-- Create policies
CREATE POLICY "Users can view customers"
ON customers FOR SELECT TO authenticated
USING (true);

CREATE POLICY "CEO and Manager can insert customers"
ON customers FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('ceo', 'manager')
  )
);

CREATE POLICY "CEO and Manager can update customers"
ON customers FOR UPDATE TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('ceo', 'manager')
  )
);

CREATE POLICY "CEO and Manager can delete customers"
ON customers FOR DELETE TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('ceo', 'manager')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(category);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON customers(full_name);

-- ============================================================================

-- 2️⃣ CREATE UPDATE TIMESTAMP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_timestamp ON customers;
CREATE TRIGGER update_customers_timestamp
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- ============================================================================

-- 3️⃣ VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE 'Other Customers Feature Setup Complete!';
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  ✓ customers table';
    RAISE NOTICE '  ✓ RLS policies';
    RAISE NOTICE '  ✓ Indexes';
    RAISE NOTICE '  ✓ Update trigger';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to use in the app!';
    RAISE NOTICE '════════════════════════════════════════';
END $$;

-- Check table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'customers'
) AS customers_table_exists;

-- Check policies
SELECT COUNT(*) as policy_count 
FROM pg_policies 
WHERE tablename = 'customers';

