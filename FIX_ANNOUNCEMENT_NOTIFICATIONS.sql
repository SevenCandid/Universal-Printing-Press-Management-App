-- =====================================================
-- FIX ANNOUNCEMENT NOTIFICATIONS
-- =====================================================
-- Recreate the notification function to ensure
-- announcements use the correct 'forum_post' type
-- =====================================================

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS trigger_notify_new_forum_post ON forum_posts;
DROP FUNCTION IF EXISTS notify_new_forum_post();

-- Recreate the function with explicit type checking
CREATE OR REPLACE FUNCTION notify_new_forum_post()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
    notification_title TEXT;
    notification_message TEXT;
    author_name TEXT;
BEGIN
    -- Get author name
    SELECT name INTO author_name FROM profiles WHERE id = NEW.author_id;
    IF author_name IS NULL THEN
        author_name := 'Someone';
    END IF;

    -- Create notification title and message based on post type
    IF NEW.is_announcement THEN
        notification_title := '📢 New Announcement';
        notification_message := author_name || ' posted an announcement: ' || NEW.title;
    ELSE
        notification_title := '💬 New Forum Post';
        notification_message := author_name || ' posted: ' || NEW.title;
    END IF;

    -- Create notification for ALL users except the author
    -- IMPORTANT: Always use 'forum_post' type (never 'announcement')
    FOR user_record IN 
        SELECT id FROM profiles WHERE id != NEW.author_id
    LOOP
        BEGIN
            INSERT INTO notifications (
                user_id,
                type,              -- ALWAYS 'forum_post'
                title,
                message,
                link,
                priority
            ) VALUES (
                user_record.id,
                'forum_post',      -- ← FIXED: Always use 'forum_post'
                notification_title,
                notification_message,
                '/forum?post=' || NEW.id,
                CASE WHEN NEW.is_announcement THEN 'high' ELSE 'normal' END
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error but don't fail the post creation
                RAISE NOTICE 'Failed to create notification for user %: %', user_record.id, SQLERRM;
        END;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_new_forum_post
AFTER INSERT ON forum_posts
FOR EACH ROW
EXECUTE FUNCTION notify_new_forum_post();

-- Verify it was created
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Announcement notification fix applied!';
  RAISE NOTICE '📝 Both regular posts and announcements now use type: forum_post';
  RAISE NOTICE '🚀 Announcements just get priority: high';
END $$;

-- Show the trigger
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notify_new_forum_post';




