-- =====================================================
-- FORUM CLEANUP SCRIPT
-- =====================================================
-- Run this FIRST to remove all existing forum tables
-- Then run CREATE_FORUM_TABLES.sql fresh
-- =====================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_forum_posts_timestamp ON public.forum_posts;
DROP TRIGGER IF EXISTS update_forum_comments_timestamp ON public.forum_comments;

-- Drop function
DROP FUNCTION IF EXISTS update_forum_timestamp();

-- Drop tables (CASCADE will remove all dependent objects)
DROP TABLE IF EXISTS public.forum_comments CASCADE;
DROP TABLE IF EXISTS public.forum_posts CASCADE;

-- =====================================================
-- ✅ CLEANUP COMPLETE!
-- =====================================================
-- Now run CREATE_FORUM_TABLES.sql
-- =====================================================




