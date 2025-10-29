-- =====================================================
-- FORUM NOTIFICATION SYSTEM
-- =====================================================
-- Automatically notify users when:
-- 1. New post is created (all users)
-- 2. CEO makes announcement (all users)
-- 3. Someone comments on a post (post author + all commenters)
-- =====================================================

-- 🔧 STEP 0: Update notifications table constraint to allow forum types
-- This is CRITICAL - without this, triggers will fail with constraint violation
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

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

-- =====================================================
-- NOTIFICATION FUNCTIONS
-- =====================================================

-- 1️⃣ FUNCTION: Notify all users about new post
CREATE OR REPLACE FUNCTION notify_new_forum_post()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Create notification title based on post type
    IF NEW.is_announcement THEN
        notification_title := '📢 New Announcement';
    ELSE
        notification_title := '💬 New Forum Post';
    END IF;

    -- Create notification message
    SELECT name INTO notification_message FROM profiles WHERE id = NEW.author_id;
    notification_message := notification_message || ' posted: ' || NEW.title;

    -- Create notification for ALL users except the author
    FOR user_record IN 
        SELECT id FROM profiles WHERE id != NEW.author_id
    LOOP
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            link,
            created_at,
            read
        ) VALUES (
            user_record.id,
            notification_title,
            notification_message,
            CASE 
                WHEN NEW.is_announcement THEN 'announcement'
                ELSE 'forum_post'
            END,
            '/forum?post=' || NEW.id,
            NOW(),
            FALSE
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2️⃣ FUNCTION: Notify about new comment
CREATE OR REPLACE FUNCTION notify_new_forum_comment()
RETURNS TRIGGER AS $$
DECLARE
    post_record RECORD;
    commenter_name TEXT;
    notification_message TEXT;
    user_to_notify UUID;
BEGIN
    -- Get post details and author
    SELECT * INTO post_record FROM forum_posts WHERE id = NEW.post_id;
    
    -- Get commenter name
    SELECT name INTO commenter_name FROM profiles WHERE id = NEW.author_id;
    
    -- Create notification message
    notification_message := commenter_name || ' commented on: ' || post_record.title;

    -- Notify post author (if they're not the commenter)
    IF post_record.author_id != NEW.author_id THEN
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            link,
            created_at,
            read
        ) VALUES (
            post_record.author_id,
            '💬 New Comment',
            notification_message,
            'forum_comment',
            '/forum?post=' || NEW.post_id,
            NOW(),
            FALSE
        );
    END IF;

    -- Notify all other commenters on this post (except current commenter and post author)
    FOR user_to_notify IN 
        SELECT DISTINCT author_id 
        FROM forum_comments 
        WHERE post_id = NEW.post_id 
        AND author_id != NEW.author_id 
        AND author_id != post_record.author_id
    LOOP
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            link,
            created_at,
            read
        ) VALUES (
            user_to_notify,
            '💬 New Comment',
            notification_message,
            'forum_comment',
            '/forum?post=' || NEW.post_id,
            NOW(),
            FALSE
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3️⃣ CREATE TRIGGERS

-- Trigger for new posts
DROP TRIGGER IF EXISTS trigger_notify_new_forum_post ON public.forum_posts;
CREATE TRIGGER trigger_notify_new_forum_post
    AFTER INSERT ON public.forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_forum_post();

-- Trigger for new comments
DROP TRIGGER IF EXISTS trigger_notify_new_forum_comment ON public.forum_comments;
CREATE TRIGGER trigger_notify_new_forum_comment
    AFTER INSERT ON public.forum_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_forum_comment();

-- 4️⃣ ADD FORUM NOTIFICATION TYPES (if notifications table doesn't have them)

-- Check if we need to update notification type constraints
-- This ensures 'forum_post', 'forum_comment', and 'announcement' are valid types

-- Note: If you have a CHECK constraint on notifications.type, you may need to update it
-- Run this query to check:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'notifications'::regclass AND contype = 'c';

-- If needed, drop and recreate the constraint:
-- ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
-- ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
--   CHECK (type IN ('order', 'task', 'expense', 'system', 'forum_post', 'forum_comment', 'announcement'));

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check triggers created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_notify_new_forum_post', 'trigger_notify_new_forum_comment');

-- =====================================================
-- ✅ FORUM NOTIFICATIONS SETUP COMPLETE!
-- =====================================================
-- Now users will receive notifications for:
-- - New posts (all users)
-- - New announcements (all users, priority)
-- - Comments on posts they authored
-- - Comments on posts they've commented on
-- =====================================================

-- 🧪 TEST THE SYSTEM:
-- 1. Create a test post
-- 2. Check notifications table - all users should have notification
-- 3. Add a comment
-- 4. Check notifications - post author should be notified
-- =====================================================

