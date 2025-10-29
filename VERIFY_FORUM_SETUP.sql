-- =====================================================
-- FORUM VERIFICATION SCRIPT
-- =====================================================
-- Run this to check if forum tables are set up correctly
-- =====================================================

-- 1️⃣ Check if tables exist
SELECT 
    'Tables Created' as check_type,
    COUNT(*) as count,
    string_agg(table_name, ', ') as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('forum_posts', 'forum_comments');

-- 2️⃣ Check if RLS is enabled
SELECT 
    'RLS Enabled' as check_type,
    tablename,
    rowsecurity as enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('forum_posts', 'forum_comments');

-- 3️⃣ Check policies
SELECT 
    'Policies' as check_type,
    tablename,
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('forum_posts', 'forum_comments')
ORDER BY tablename, policyname;

-- 4️⃣ Check columns in forum_posts
SELECT 
    'forum_posts columns' as check_type,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'forum_posts'
ORDER BY ordinal_position;

-- 5️⃣ Check columns in forum_comments
SELECT 
    'forum_comments columns' as check_type,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'forum_comments'
ORDER BY ordinal_position;

-- 6️⃣ Try to select from tables (will error if not accessible)
SELECT 
    'forum_posts test' as check_type,
    COUNT(*) as post_count
FROM public.forum_posts;

SELECT 
    'forum_comments test' as check_type,
    COUNT(*) as comment_count
FROM public.forum_comments;

-- =====================================================
-- ✅ If all queries run successfully, forum is ready!
-- =====================================================

