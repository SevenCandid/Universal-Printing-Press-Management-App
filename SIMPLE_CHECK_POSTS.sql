-- Simple check to see all posts
-- Copy and paste this ENTIRE query into Supabase SQL Editor

SELECT 
    id,
    title,
    category,
    author_id,
    created_at
FROM forum_posts
ORDER BY created_at DESC;

