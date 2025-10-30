-- Check if posts exist in database
-- Run this in Supabase SQL Editor to see your posts

-- 1. Check all posts
SELECT 
    id,
    title,
    content,
    category,
    author_id,
    is_announcement,
    created_at
FROM forum_posts
ORDER BY created_at DESC;

-- 2. Check with author names
SELECT 
    fp.id,
    fp.title,
    fp.category,
    fp.author_id,
    p.name as author_name,
    p.email as author_email,
    fp.created_at
FROM forum_posts fp
LEFT JOIN profiles p ON fp.author_id = p.id
ORDER BY fp.created_at DESC;

-- 3. Check RLS policies for forum_posts
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'forum_posts';

-- 4. Count posts
SELECT COUNT(*) as total_posts FROM forum_posts;

-- 5. Check if your user can see posts (replace YOUR_USER_ID with your actual user ID)
-- First, get your user ID from the profiles table
SELECT id, name, email FROM profiles LIMIT 5;




