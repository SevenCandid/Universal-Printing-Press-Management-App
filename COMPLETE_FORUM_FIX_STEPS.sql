-- =====================================================
-- COMPLETE FORUM FIX - RUN THIS IN EXACT ORDER
-- =====================================================
-- This will fix the notification constraint error
-- Run this entire file in Supabase SQL Editor
-- =====================================================

-- STEP 1: Fix the notifications table constraint FIRST
-- (This must come BEFORE creating triggers)
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '🔧 STEP 1: Fixing notifications table constraint...';
END $$;

-- Drop existing constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with forum types
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

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Constraint updated successfully!';
END $$;

-- =====================================================
-- STEP 2: Drop old triggers (if they exist)
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '🔧 STEP 2: Removing old triggers...';
END $$;

DROP TRIGGER IF EXISTS trigger_notify_new_forum_post ON forum_posts;
DROP TRIGGER IF EXISTS trigger_notify_new_forum_comment ON forum_comments;

DROP FUNCTION IF EXISTS notify_new_forum_post();
DROP FUNCTION IF EXISTS notify_new_forum_comment();

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Old triggers removed!';
END $$;

-- =====================================================
-- STEP 3: Create notification functions
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '🔧 STEP 3: Creating notification functions...';
END $$;

-- Function: Notify all users about new post
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
            type,
            title,
            message,
            link,
            priority
        ) VALUES (
            user_record.id,
            'forum_post',
            notification_title,
            notification_message,
            '/forum?post=' || NEW.id,
            CASE WHEN NEW.is_announcement THEN 'high' ELSE 'normal' END
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Notify post author and commenters about new comment
CREATE OR REPLACE FUNCTION notify_new_forum_comment()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
    post_record RECORD;
    commenter_name TEXT;
BEGIN
    -- Get post details
    SELECT title, author_id INTO post_record FROM forum_posts WHERE id = NEW.post_id;
    
    -- Get commenter name
    SELECT name INTO commenter_name FROM profiles WHERE id = NEW.author_id;

    -- Notify post author (if they're not the commenter)
    IF post_record.author_id != NEW.author_id THEN
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            link,
            priority
        ) VALUES (
            post_record.author_id,
            'forum_comment',
            '💬 New Comment',
            commenter_name || ' commented on your post: ' || post_record.title,
            '/forum?post=' || NEW.post_id,
            'normal'
        );
    END IF;

    -- Notify all other commenters (excluding post author and current commenter)
    FOR user_record IN 
        SELECT DISTINCT author_id 
        FROM forum_comments 
        WHERE post_id = NEW.post_id 
        AND author_id != NEW.author_id 
        AND author_id != post_record.author_id
    LOOP
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            link,
            priority
        ) VALUES (
            user_record.author_id,
            'forum_comment',
            '💬 New Comment',
            commenter_name || ' also commented on: ' || post_record.title,
            '/forum?post=' || NEW.post_id,
            'normal'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Functions created successfully!';
END $$;

-- =====================================================
-- STEP 4: Create triggers
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '🔧 STEP 4: Creating triggers...';
END $$;

-- Trigger: New forum post
CREATE TRIGGER trigger_notify_new_forum_post
AFTER INSERT ON forum_posts
FOR EACH ROW
EXECUTE FUNCTION notify_new_forum_post();

-- Trigger: New forum comment
CREATE TRIGGER trigger_notify_new_forum_comment
AFTER INSERT ON forum_comments
FOR EACH ROW
EXECUTE FUNCTION notify_new_forum_comment();

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Triggers created successfully!';
END $$;

-- =====================================================
-- STEP 5: Verify everything
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '🔍 STEP 5: Verifying setup...';
END $$;

-- Check constraint
DO $$
DECLARE
    constraint_exists INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_exists
    FROM information_schema.check_constraints
    WHERE constraint_name = 'notifications_type_check';
    
    IF constraint_exists > 0 THEN
        RAISE NOTICE '✅ Constraint exists';
    ELSE
        RAISE NOTICE '❌ Constraint NOT found';
    END IF;
END $$;

-- Check triggers
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name LIKE '%forum%';
    
    IF trigger_count = 2 THEN
        RAISE NOTICE '✅ Both triggers exist';
    ELSE
        RAISE NOTICE '❌ Expected 2 triggers, found: %', trigger_count;
    END IF;
END $$;

-- Check functions
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name LIKE '%forum%';
    
    IF function_count = 2 THEN
        RAISE NOTICE '✅ Both functions exist';
    ELSE
        RAISE NOTICE '❌ Expected 2 functions, found: %', function_count;
    END IF;
END $$;

-- =====================================================
-- FINAL MESSAGE
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '🎉 FORUM SETUP COMPLETE!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Notifications constraint updated';
  RAISE NOTICE '✅ Notification functions created';
  RAISE NOTICE '✅ Triggers attached to tables';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '1. Enable Realtime for forum_posts & forum_comments';
  RAISE NOTICE '2. Refresh your browser';
  RAISE NOTICE '3. Try creating a forum post';
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
END $$;

