'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  showForumPostNotification, 
  showForumCommentNotification,
  showAnnouncementNotification,
  initializeNotifications 
} from '@/lib/browserNotifications'

/**
 * Forum Notification Provider
 * Listens for real-time forum events and shows browser notifications
 */
export function ForumNotificationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.log('[ForumNotificationProvider] 🚀 Initializing...')
    
    // Initialize notification system
    initializeNotifications()

    // Get current user ID
    let currentUserId: string | undefined

    supabase.auth.getUser().then(({ data }) => {
      currentUserId = data.user?.id
      console.log('[ForumNotificationProvider] 👤 Current User ID:', currentUserId)
    })

    // Subscribe to new forum posts
    console.log('[ForumNotificationProvider] 📡 Setting up real-time listener for posts...')
    
    const postsChannel = supabase
      .channel('forum_posts_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_posts',
        },
        async (payload) => {
          console.log('[ForumNotificationProvider] 📬 New post detected:', payload.new)
          const newPost = payload.new as any

          // Don't notify the post author
          if (newPost.author_id === currentUserId) {
            console.log('[ForumNotificationProvider] ⏭️  Skipping - you are the author')
            return
          }
          
          console.log('[ForumNotificationProvider] 🔔 Will show notification for post:', newPost.title)

          // Get author name
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', newPost.author_id)
            .single()

          const authorName = profile?.name || 'Someone'

          // Show notification based on post type
          if (newPost.is_announcement) {
            console.log('[ForumNotificationProvider] 📢 Showing announcement notification')
            showAnnouncementNotification(authorName, newPost.title, newPost.id)
          } else {
            console.log('[ForumNotificationProvider] 💬 Showing post notification')
            showForumPostNotification(authorName, newPost.title, newPost.id, false)
          }
        }
      )
      .subscribe((status) => {
        console.log('[ForumNotificationProvider] Posts channel status:', status)
      })

    // Subscribe to new forum comments
    console.log('[ForumNotificationProvider] 📡 Setting up real-time listener for comments...')
    
    const commentsChannel = supabase
      .channel('forum_comments_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_comments',
        },
        async (payload) => {
          console.log('[ForumNotificationProvider] 💬 New comment detected:', payload.new)
          const newComment = payload.new as any

          // Don't notify the commenter
          if (newComment.author_id === currentUserId) {
            console.log('[ForumNotificationProvider] ⏭️  Skipping - you are the commenter')
            return
          }
          
          console.log('[ForumNotificationProvider] 🔍 Checking if user should be notified...')

          // Get post details
          const { data: post } = await supabase
            .from('forum_posts')
            .select('title, author_id')
            .eq('id', newComment.post_id)
            .single()

          // Only notify if:
          // 1. User is the post author, OR
          // 2. User has commented on this post before
          if (post) {
            let shouldNotify = false

            // Check if user is post author
            if (post.author_id === currentUserId) {
              shouldNotify = true
            } else {
              // Check if user has commented on this post
              const { data: userComments } = await supabase
                .from('forum_comments')
                .select('id')
                .eq('post_id', newComment.post_id)
                .eq('author_id', currentUserId)
                .limit(1)

              shouldNotify = (userComments?.length || 0) > 0
            }

            if (shouldNotify) {
              console.log('[ForumNotificationProvider] ✅ User should be notified')
              
              // Get commenter name
              const { data: profile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', newComment.author_id)
                .single()

              const commenterName = profile?.name || 'Someone'
              console.log('[ForumNotificationProvider] 🔔 Showing comment notification')
              showForumCommentNotification(commenterName, post.title, newComment.post_id)
            } else {
              console.log('[ForumNotificationProvider] ⏭️  Skipping - user not involved in this discussion')
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[ForumNotificationProvider] Comments channel status:', status)
      })

    // Cleanup subscriptions
    return () => {
      console.log('[ForumNotificationProvider] 🧹 Cleaning up subscriptions...')
      supabase.removeChannel(postsChannel)
      supabase.removeChannel(commentsChannel)
    }
  }, [])

  return <>{children}</>
}

