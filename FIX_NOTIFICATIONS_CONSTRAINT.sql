-- Fix Notifications Table Constraint for Forum
-- This adds 'forum_post' and 'forum_comment' to the allowed notification types

-- Step 1: Drop the existing check constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Step 2: Add the updated constraint with forum types included
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
  'forum_post',      -- NEW: For new forum posts
  'forum_comment'    -- NEW: For new forum comments
));

-- Verify the constraint was updated
SELECT 
  constraint_name, 
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'notifications_type_check';

-- Optional: Show all notification types currently in use
SELECT DISTINCT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY type;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Notifications table constraint updated successfully!';
  RAISE NOTICE '📝 Forum notification types (forum_post, forum_comment) are now allowed.';
END $$;




