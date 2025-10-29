-- =============================================================================
-- ADD GPS TRACKING COLUMNS TO ATTENDANCE TABLE
-- =============================================================================
-- This adds distance and GPS accuracy columns to track location verification details
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Add columns for distance from office and GPS accuracy
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS distance_from_office INTEGER,  -- Distance in meters
ADD COLUMN IF NOT EXISTS gps_accuracy INTEGER,          -- GPS accuracy in meters
ADD COLUMN IF NOT EXISTS checkout_distance INTEGER,     -- Distance at checkout in meters
ADD COLUMN IF NOT EXISTS checkout_gps_accuracy INTEGER; -- GPS accuracy at checkout in meters

-- Add comments for documentation
COMMENT ON COLUMN public.attendance.distance_from_office IS 'Distance from office at check-in (meters)';
COMMENT ON COLUMN public.attendance.gps_accuracy IS 'GPS accuracy at check-in (meters)';
COMMENT ON COLUMN public.attendance.checkout_distance IS 'Distance from office at check-out (meters)';
COMMENT ON COLUMN public.attendance.checkout_gps_accuracy IS 'GPS accuracy at check-out (meters)';

-- Create index for querying by distance (optional, for future analytics)
CREATE INDEX IF NOT EXISTS idx_attendance_distance ON public.attendance(distance_from_office);

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'attendance'
  AND column_name IN ('distance_from_office', 'gps_accuracy', 'checkout_distance', 'checkout_gps_accuracy');

-- ✅ Success message
DO $$
BEGIN
  RAISE NOTICE '✅ GPS tracking columns added successfully!';
  RAISE NOTICE '   - distance_from_office';
  RAISE NOTICE '   - gps_accuracy';
  RAISE NOTICE '   - checkout_distance';
  RAISE NOTICE '   - checkout_gps_accuracy';
END $$;

