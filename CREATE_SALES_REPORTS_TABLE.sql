-- =====================================================
-- SALES REPORTS SYSTEM - Database Schema
-- =====================================================
-- Creates sales_reports table for sales representatives
-- to submit daily reports, outreach remarks, etc. to CEO
-- =====================================================

-- 1️⃣ CREATE SALES REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.sales_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL,
    report_type TEXT NOT NULL DEFAULT 'daily' CHECK (report_type IN ('daily', 'weekly', 'monthly', 'outreach', 'meeting', 'other')),
    content TEXT NOT NULL,
    remarks TEXT,
    location TEXT,
    clients_contacted INTEGER DEFAULT 0,
    leads_generated INTEGER DEFAULT 0,
    follow_ups_required BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one report per sales rep per day (can be relaxed if needed)
    CONSTRAINT unique_daily_report UNIQUE(submitted_by, report_date, report_type)
);

-- 2️⃣ CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_sales_reports_submitted_by ON public.sales_reports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_sales_reports_report_date ON public.sales_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_reports_created_at ON public.sales_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_reports_report_type ON public.sales_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_sales_reports_status ON public.sales_reports(status);

-- 3️⃣ CREATE TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_sales_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sales_reports_updated_at ON public.sales_reports;
CREATE TRIGGER trigger_update_sales_reports_updated_at
    BEFORE UPDATE ON public.sales_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_reports_updated_at();

-- 4️⃣ ENABLE ROW LEVEL SECURITY
ALTER TABLE public.sales_reports ENABLE ROW LEVEL SECURITY;

-- 5️⃣ DROP EXISTING POLICIES (if any)
DROP POLICY IF EXISTS "Sales representatives can insert their own reports" ON public.sales_reports;
DROP POLICY IF EXISTS "Sales representatives can view their own reports" ON public.sales_reports;
DROP POLICY IF EXISTS "Sales representatives can update their own reports" ON public.sales_reports;
DROP POLICY IF EXISTS "CEO can view all sales reports" ON public.sales_reports;
DROP POLICY IF EXISTS "CEO can update sales reports status" ON public.sales_reports;

-- 6️⃣ CREATE RLS POLICIES

-- Sales representatives can insert their own reports
CREATE POLICY "Sales representatives can insert their own reports"
ON public.sales_reports
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = submitted_by
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'sales_representative'
    )
);

-- Sales representatives can view their own reports
CREATE POLICY "Sales representatives can view their own reports"
ON public.sales_reports
FOR SELECT
TO authenticated
USING (
    auth.uid() = submitted_by
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ceo'
    )
);

-- Sales representatives can update their own reports (only if not reviewed)
CREATE POLICY "Sales representatives can update their own reports"
ON public.sales_reports
FOR UPDATE
TO authenticated
USING (
    auth.uid() = submitted_by
    AND status = 'submitted'
)
WITH CHECK (
    auth.uid() = submitted_by
);

-- CEO can view all sales reports
CREATE POLICY "CEO can view all sales reports"
ON public.sales_reports
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ceo'
    )
);

-- CEO can update sales reports status (review/archive)
CREATE POLICY "CEO can update sales reports status"
ON public.sales_reports
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ceo'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ceo'
    )
);

-- 7️⃣ VERIFICATION QUERIES
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Sales reports table created successfully!';
  RAISE NOTICE '✅ RLS policies created for sales_representative and ceo roles';
END $$;

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sales_reports'
ORDER BY ordinal_position;

-- Check policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'sales_reports'
ORDER BY policyname;

