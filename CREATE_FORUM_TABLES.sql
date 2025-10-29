-- =====================================================
-- FORUM SYSTEM - Database Schema
-- =====================================================
-- Creates forum_posts and forum_comments tables
-- CEO can make announcements, all users can post/comment
-- =====================================================

-- 1️⃣ CREATE FORUM POSTS TABLE
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'discussion',
    is_announcement BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_category CHECK (category IN ('announcement', 'discussion', 'question', 'idea', 'general'))
);

-- 2️⃣ CREATE FORUM COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.forum_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3️⃣ CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON public.forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON public.forum_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON public.forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_pinned ON public.forum_posts(is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON public.forum_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_author ON public.forum_comments(author_id);

-- 4️⃣ ENABLE ROW LEVEL SECURITY
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

-- 5️⃣ RLS POLICIES FOR FORUM POSTS

-- Everyone can view all posts
CREATE POLICY "Anyone can view forum posts"
    ON public.forum_posts
    FOR SELECT
    USING (true);

-- All authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
    ON public.forum_posts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
    ON public.forum_posts
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
    ON public.forum_posts
    FOR DELETE
    TO authenticated
    USING (auth.uid() = author_id);

-- CEOs can update any post (for moderation)
CREATE POLICY "CEOs can moderate posts"
    ON public.forum_posts
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ceo'
        )
    );

-- 6️⃣ RLS POLICIES FOR FORUM COMMENTS

-- Everyone can view all comments
CREATE POLICY "Anyone can view comments"
    ON public.forum_comments
    FOR SELECT
    USING (true);

-- All authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
    ON public.forum_comments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
    ON public.forum_comments
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
    ON public.forum_comments
    FOR DELETE
    TO authenticated
    USING (auth.uid() = author_id);

-- 7️⃣ FUNCTIONS FOR AUTOMATIC TIMESTAMPS

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_forum_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for forum_posts
DROP TRIGGER IF EXISTS update_forum_posts_timestamp ON public.forum_posts;
CREATE TRIGGER update_forum_posts_timestamp
    BEFORE UPDATE ON public.forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_forum_timestamp();

-- Trigger for forum_comments
DROP TRIGGER IF EXISTS update_forum_comments_timestamp ON public.forum_comments;
CREATE TRIGGER update_forum_comments_timestamp
    BEFORE UPDATE ON public.forum_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_forum_timestamp();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('forum_posts', 'forum_comments');

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('forum_posts', 'forum_comments');

-- =====================================================
-- ✅ SETUP COMPLETE!
-- =====================================================
-- Now run this SQL in Supabase SQL Editor
-- Then create the ForumBase component
-- =====================================================

