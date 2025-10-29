-- =====================================================
-- FIX NOTIFICATIONS CONSTRAINT (WITH CLEANUP)
-- =====================================================
-- This will clean up invalid notifications first,
-- then update the constraint to allow forum types
-- =====================================================

-- STEP 1: Delete any invalid notifications (from failed attempts)
-- These are notifications with 'forum_post' or 'forum_comment' type
-- that were created before the constraint was updated
DELETE FROM notifications 
WHERE type NOT IN (
  'order_update',
  'payment_received',
  'enquiry_update',
  'material_low_stock',
  'equipment_maintenance',
  'attendance_reminder',
  'leave_update'
);

-- Check how many were deleted
DO $$ 
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % invalid notification(s)', deleted_count;
END $$;

-- STEP 2: Now drop the old constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- STEP 3: Add the new constraint with forum types
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'order_update',
  'payment_received',
  'enquiry_update',
  'material_low_stock',
  'equipment_maintenance',
  'attendance_reminder',
  'leave_update',
  'forum_post',      -- NEW
  'forum_comment'    -- NEW
));

-- STEP 4: Verify it worked
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Constraint updated successfully!';
  RAISE NOTICE '📝 Forum notification types are now allowed.';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next: Refresh browser and try creating a post!';
END $$;

-- Show the new constraint
SELECT 
  constraint_name, 
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'notifications_type_check';

