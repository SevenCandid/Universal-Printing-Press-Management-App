-- =====================================================
-- REMOVE NOTIFICATION TRIGGERS - Quick Fix
-- =====================================================
-- Run this FIRST to remove the problematic triggers
-- Then leave requests will work without notification errors

-- Drop the notification triggers
DROP TRIGGER IF EXISTS leave_request_notification ON public.leave_requests;
DROP TRIGGER IF EXISTS leave_decision_notification ON public.leave_requests;

-- Optionally drop the functions too
DROP FUNCTION IF EXISTS notify_leave_request();
DROP FUNCTION IF EXISTS notify_leave_decision();

-- Verify triggers are gone
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'leave_requests';

-- If the query above returns no rows, the triggers are successfully removed!

-- =====================================================
-- DONE! ✅
-- =====================================================
-- You can now submit leave requests without notification errors
-- The full ATTENDANCE_BREAKS_AND_LEAVE_SETUP.sql script 
-- will work properly after running this.

