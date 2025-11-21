-- =============================================================================
-- CREATE BANK DEPOSITS TABLE - COMPLETE DATABASE SETUP
-- =============================================================================
-- Universal Printing Press (UPP) - Bank Deposits Tracking
-- This table stores momo, cash, and bank deposit amounts by period
-- Only Executive Assistant can insert/update, only CEO can view
-- =============================================================================

-- =============================================================================
-- 1. CREATE BANK_DEPOSITS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bank_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'custom')),
  period_key TEXT NOT NULL, -- e.g., '2024-01', '2024-W01', or '2024-01-01_2024-01-31'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  momo_amount NUMERIC(12, 2) DEFAULT 0,
  cash_amount NUMERIC(12, 2) DEFAULT 0,
  bank_deposit_amount NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period_type, period_key)
);

DO $$ BEGIN RAISE NOTICE '✓ Created bank_deposits table'; END $$;

-- =============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_bank_deposits_period_type_key ON public.bank_deposits(period_type, period_key);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_dates ON public.bank_deposits(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_created_by ON public.bank_deposits(created_by);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_updated_by ON public.bank_deposits(updated_by);

DO $$ BEGIN RAISE NOTICE '✓ Created indexes for bank_deposits table'; END $$;

-- =============================================================================
-- 3. CREATE TRIGGER FUNCTION FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_bank_deposits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bank_deposits_updated_at_trigger ON public.bank_deposits;

CREATE TRIGGER update_bank_deposits_updated_at_trigger
    BEFORE UPDATE ON public.bank_deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_deposits_updated_at();

DO $$ BEGIN RAISE NOTICE '✓ Created trigger for updated_at column'; END $$;

-- =============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.bank_deposits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN RAISE NOTICE '✓ Enabled RLS on bank_deposits table'; END $$;

-- =============================================================================
-- 5. CREATE RLS POLICIES
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "CEO can view bank deposits" ON public.bank_deposits;
DROP POLICY IF EXISTS "Executive Assistant can insert bank deposits" ON public.bank_deposits;
DROP POLICY IF EXISTS "Executive Assistant can update bank deposits" ON public.bank_deposits;
DROP POLICY IF EXISTS "Executive Assistant can delete bank deposits" ON public.bank_deposits;

-- Policy: Only CEO can view bank deposits
CREATE POLICY "CEO can view bank deposits"
ON public.bank_deposits
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ceo'
    )
);

-- Policy: Executive Assistant can insert bank deposits
CREATE POLICY "Executive Assistant can insert bank deposits"
ON public.bank_deposits
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'executive_assistant'
    )
);

-- Policy: Executive Assistant can update bank deposits
CREATE POLICY "Executive Assistant can update bank deposits"
ON public.bank_deposits
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'executive_assistant'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'executive_assistant'
    )
);

-- Policy: Executive Assistant can delete bank deposits
CREATE POLICY "Executive Assistant can delete bank deposits"
ON public.bank_deposits
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'executive_assistant'
    )
);

DO $$ BEGIN RAISE NOTICE '✓ Created RLS policies for bank_deposits table'; END $$;

-- =============================================================================
-- 6. VERIFICATION QUERIES
-- =============================================================================

-- Show table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'bank_deposits'
ORDER BY ordinal_position;

-- Show policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'bank_deposits';

DO $$ BEGIN 
    RAISE NOTICE '✅ Bank deposits table setup completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '  - Table: bank_deposits created';
    RAISE NOTICE '  - Indexes: Created for performance';
    RAISE NOTICE '  - RLS: Enabled with policies';
    RAISE NOTICE '  - CEO: Can view all bank deposits';
    RAISE NOTICE '  - Executive Assistant: Can insert/update/delete bank deposits';
END $$;

