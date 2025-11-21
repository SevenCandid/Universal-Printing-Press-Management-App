-- =============================================================================
-- CREATE MATERIALS TO BUY TABLE - COMPLETE DATABASE SETUP
-- =============================================================================
-- Universal Printing Press (UPP) - Materials Purchase Requests
-- This table stores materials that need to be bought
-- Only Executive Assistant can insert/update/delete, CEO can view
-- =============================================================================

-- =============================================================================
-- 1. CREATE MATERIALS_TO_BUY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.materials_to_buy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('paper', 'ink', 'MAGiCARD', 'chemicals', 'embroidery', 'sewing', 'dtf', 'lf', 'other')),
  quantity_needed NUMERIC(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'purchased')),
  estimated_cost NUMERIC(12, 2),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✓ Created materials_to_buy table'; END $$;

-- =============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_materials_to_buy_category ON public.materials_to_buy(category);
CREATE INDEX IF NOT EXISTS idx_materials_to_buy_status ON public.materials_to_buy(status);
CREATE INDEX IF NOT EXISTS idx_materials_to_buy_priority ON public.materials_to_buy(priority);
CREATE INDEX IF NOT EXISTS idx_materials_to_buy_created_by ON public.materials_to_buy(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_to_buy_vendor_id ON public.materials_to_buy(vendor_id);
CREATE INDEX IF NOT EXISTS idx_materials_to_buy_created_at ON public.materials_to_buy(created_at DESC);

DO $$ BEGIN RAISE NOTICE '✓ Created indexes for materials_to_buy table'; END $$;

-- =============================================================================
-- 3. CREATE TRIGGER FUNCTION FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_materials_to_buy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN RAISE NOTICE '✓ Created trigger function for updated_at'; END $$;

-- =============================================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_update_materials_to_buy_updated_at ON public.materials_to_buy;

CREATE TRIGGER trigger_update_materials_to_buy_updated_at
BEFORE UPDATE ON public.materials_to_buy
FOR EACH ROW
EXECUTE FUNCTION update_materials_to_buy_updated_at();

DO $$ BEGIN RAISE NOTICE '✓ Created trigger for updated_at'; END $$;

-- =============================================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.materials_to_buy ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN RAISE NOTICE '✓ Enabled RLS on materials_to_buy table'; END $$;

-- =============================================================================
-- 6. CREATE RLS POLICIES
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "CEO can view all materials to buy" ON public.materials_to_buy;
DROP POLICY IF EXISTS "Executive Assistant can view all materials to buy" ON public.materials_to_buy;
DROP POLICY IF EXISTS "Executive Assistant can insert materials to buy" ON public.materials_to_buy;
DROP POLICY IF EXISTS "Executive Assistant can update materials to buy" ON public.materials_to_buy;
DROP POLICY IF EXISTS "Executive Assistant can delete materials to buy" ON public.materials_to_buy;

-- CEO can view all materials to buy
CREATE POLICY "CEO can view all materials to buy"
ON public.materials_to_buy
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND LOWER(profiles.role) = 'ceo'
  )
);

-- Executive Assistant can view all materials to buy
CREATE POLICY "Executive Assistant can view all materials to buy"
ON public.materials_to_buy
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND LOWER(profiles.role) = 'executive_assistant'
  )
);

-- Executive Assistant can insert materials to buy
CREATE POLICY "Executive Assistant can insert materials to buy"
ON public.materials_to_buy
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND LOWER(profiles.role) = 'executive_assistant'
  )
  AND created_by = auth.uid()
);

-- Executive Assistant can update materials to buy
CREATE POLICY "Executive Assistant can update materials to buy"
ON public.materials_to_buy
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND LOWER(profiles.role) = 'executive_assistant'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND LOWER(profiles.role) = 'executive_assistant'
  )
  AND updated_by = auth.uid()
);

-- Executive Assistant can delete materials to buy
CREATE POLICY "Executive Assistant can delete materials to buy"
ON public.materials_to_buy
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND LOWER(profiles.role) = 'executive_assistant'
  )
);

DO $$ BEGIN RAISE NOTICE '✓ Created RLS policies for materials_to_buy table'; END $$;

-- =============================================================================
-- 7. VERIFICATION QUERIES
-- =============================================================================

-- Verify table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'materials_to_buy') THEN
    RAISE NOTICE '✓ Table materials_to_buy exists';
  ELSE
    RAISE EXCEPTION '✗ Table materials_to_buy does not exist';
  END IF;
END $$;

-- Verify RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'materials_to_buy'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✓ RLS is enabled on materials_to_buy';
  ELSE
    RAISE EXCEPTION '✗ RLS is not enabled on materials_to_buy';
  END IF;
END $$;

-- Verify policies exist
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'materials_to_buy';
  
  IF policy_count >= 5 THEN
    RAISE NOTICE '✓ Found % policies on materials_to_buy', policy_count;
  ELSE
    RAISE EXCEPTION '✗ Expected at least 5 policies, found %', policy_count;
  END IF;
END $$;

-- =============================================================================
-- COMPLETE
-- =============================================================================

DO $$ BEGIN 
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'MATERIALS TO BUY TABLE SETUP COMPLETE';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '✓ Table: materials_to_buy';
  RAISE NOTICE '✓ Indexes: 6 indexes created';
  RAISE NOTICE '✓ Triggers: updated_at trigger active';
  RAISE NOTICE '✓ RLS: Enabled with 5 policies';
  RAISE NOTICE '✓ Permissions: CEO (view), Executive Assistant (full access)';
  RAISE NOTICE '=============================================================================';
END $$;

