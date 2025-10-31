-- =====================================================
-- FIX ORDER NOTIFICATION TYPE CONSTRAINT
-- =====================================================
-- The trigger function uses type 'order' but the constraint
-- doesn't allow it. This fixes the constraint to include
-- 'order' and 'task' types.
-- =====================================================

-- Step 1: Drop the existing check constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Step 2: Add the updated constraint with 'order' and 'task' types included
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'order',                -- For order-related notifications (new, update, delete)
  'task',                 -- For task-related notifications
  'order_update',          -- Legacy: order update notifications
  'payment_received',      -- Payment received notifications
  'enquiry_update',        -- Enquiry update notifications
  'material_low_stock',    -- Material low stock alerts
  'equipment_maintenance', -- Equipment maintenance reminders
  'attendance_reminder',    -- Attendance reminders
  'leave_update',          -- Leave request updates
  'forum_post',            -- Forum post notifications
  'forum_comment'          -- Forum comment notifications
));

-- Step 3: Verify the constraint was updated
SELECT 
  constraint_name, 
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'notifications_type_check';

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Notifications table constraint updated successfully!';
  RAISE NOTICE '📝 Order and task notification types are now allowed.';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 You can now create orders without errors!';
END $$;

