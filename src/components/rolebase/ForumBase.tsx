'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import NotificationSettings from '@/components/ui/NotificationSettings'
import { 
  MegaphoneIcon, 
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon,
  PlusIcon,
  UserCircleIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  FunnelIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { MegaphoneIcon as MegaphoneSolid } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'

interface ForumPost {
  id: string
  title: string
  content: string
  author_id: string
  category: 'announcement' | 'discussion' | 'question' | 'idea' | 'general'
  is_announcement: boolean
  is_pinned: boolean
  created_at: string
  updated_at: string
  profiles?: {
    name?: string
    role?: string
  }
  comment_count?: number
}

interface ForumComment {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  profiles?: {
    name?: string
    role?: string
  }
}

export default function ForumBase({ role }: { role: string }) {
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null)
  const [comments, setComments] = useState<ForumComment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('all') // 'today', 'week', 'month', 'all'
  const [currentUserId, setCurrentUserId] = useState<string>('')
  
  // Form states
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostCategory, setNewPostCategory] = useState<string>('discussion')
  const [isAnnouncement, setIsAnnouncement] = useState(false)
  const [newComment, setNewComment] = useState('')

  const isCEO = role === 'ceo'

  useEffect(() => {
    // Get current user ID
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id)
      }
    })
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [categoryFilter, periodFilter])

  const fetchPosts = async () => {
    try {
      console.log('🔍 Fetching posts... Category filter:', categoryFilter, 'Period filter:', periodFilter)
      
      let query = supabase
        .from('forum_posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      // Apply category filter
      if (categoryFilter === 'announcement') {
        // Filter by is_announcement flag for announcements
        query = query.eq('is_announcement', true)
      } else if (categoryFilter !== 'all') {
        // Filter by category for other filters
        query = query.eq('category', categoryFilter)
      }

      // Apply period filter
      if (periodFilter !== 'all') {
        const now = new Date()
        let startDate: Date
        
        if (periodFilter === 'today') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        } else if (periodFilter === 'week') {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        } else if (periodFilter === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        } else {
          startDate = new Date(0) // All time
        }
        
        query = query.gte('created_at', startDate.toISOString())
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Supabase error fetching posts:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details
        })
        throw error
      }

      if (!data) {
        console.warn('⚠️  No data returned from forum_posts')
        setPosts([])
        return
      }

      console.log('✅ Raw posts fetched:', data.length, 'posts')
      console.log('Posts:', data)

      // Fetch profiles and comment counts for each post
      const postsWithDetails = await Promise.all(
        data.map(async (post) => {
          console.log('📝 Processing post:', post.id, post.title)
          
          // Fetch author profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('name, role')
            .eq('id', post.author_id)
            .single()

          if (profileError) {
            console.warn('⚠️  Profile fetch error for author:', post.author_id, profileError)
          }

          // Fetch comment count
          const { count, error: countError } = await supabase
            .from('forum_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)
          
          if (countError) {
            console.warn('⚠️  Comment count error for post:', post.id, countError)
          }
          
          return { 
            ...post, 
            profiles: profile || { name: 'Unknown User', role: 'staff' },
            comment_count: count || 0 
          }
        })
      )

      console.log('✅ Posts with details:', postsWithDetails.length)
      console.log('Setting posts state...')
      setPosts(postsWithDetails)
    } catch (error: any) {
      console.error('Error fetching posts:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      toast.error(`Failed to load forum posts: ${error?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('forum_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Fetch profiles for each comment
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, role')
            .eq('id', comment.author_id)
            .single()
          
          return { ...comment, profiles: profile }
        })
      )

      setComments(commentsWithProfiles)
    } catch (error: any) {
      console.error('Error fetching comments:', error)
      toast.error('Failed to load comments')
    }
  }

  const createPost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      const { data: userData, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        toast.error('Authentication error. Please refresh and try again.')
        return
      }
      
      if (!userData.user) {
        console.error('No user found')
        toast.error('You must be logged in to create a post. Please login and try again.')
        return
      }
      
      console.log('Creating post as user:', userData.user.id)

      const postData: any = {
        title: newPostTitle,
        content: newPostContent,
        category: newPostCategory,
        author_id: userData.user.id,
        is_announcement: isCEO && isAnnouncement,
        is_pinned: isCEO && isAnnouncement
      }

      const { data, error } = await supabase
        .from('forum_posts')
        .insert([postData])
        .select()

      if (error) {
        console.error('❌ Supabase error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log('✅ Post created successfully:', data)
      toast.success(isAnnouncement ? '📢 Announcement posted!' : '✅ Post created!')
      setShowCreateModal(false)
      setNewPostTitle('')
      setNewPostContent('')
      setNewPostCategory('discussion')
      setIsAnnouncement(false)
      fetchPosts()
    } catch (error: any) {
      console.error('❌ Error creating post:', error)
      
      // Detailed error logging
      if (error?.message) {
        console.error('Error message:', error.message)
        toast.error(`Failed: ${error.message}`)
      } else if (error?.code) {
        console.error('Error code:', error.code)
        toast.error(`Database error. Check console for details.`)
      } else {
        console.error('Unknown error type:', typeof error, error)
        toast.error('Failed to create post. Check console for details.')
      }
    }
  }

  const addComment = async () => {
    if (!newComment.trim() || !selectedPost) return

    try {
      const { data: userData, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        toast.error('Authentication error. Please refresh and try again.')
        return
      }
      
      if (!userData.user) {
        console.error('No user found')
        toast.error('You must be logged in to comment. Please login and try again.')
        return
      }

      const { data, error } = await supabase
        .from('forum_comments')
        .insert([{
          post_id: selectedPost.id,
          author_id: userData.user.id,
          content: newComment
        }])
        .select()

      if (error) {
        console.error('❌ Supabase error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log('✅ Comment added successfully:', data)
      toast.success('Comment added!')
      setNewComment('')
      fetchComments(selectedPost.id)
      fetchPosts() // Refresh to update comment count
    } catch (error: any) {
      console.error('❌ Error adding comment:', error)
      
      if (error?.message) {
        toast.error(`Failed: ${error.message}`)
      } else {
        toast.error('Failed to add comment. Check console for details.')
      }
    }
  }

  const openEditModal = (post: ForumPost) => {
    setEditingPost(post)
    setNewPostTitle(post.title)
    setNewPostContent(post.content)
    setNewPostCategory(post.category)
    setIsAnnouncement(post.is_announcement)
    setShowEditModal(true)
  }

  const updatePost = async () => {
    if (!editingPost || !newPostTitle.trim() || !newPostContent.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({
          title: newPostTitle,
          content: newPostContent,
          category: newPostCategory,
          is_announcement: isCEO && isAnnouncement,
          is_pinned: isCEO && isAnnouncement,
        })
        .eq('id', editingPost.id)

      if (error) throw error

      toast.success('✅ Post updated!')
      setShowEditModal(false)
      setEditingPost(null)
      setNewPostTitle('')
      setNewPostContent('')
      setNewPostCategory('discussion')
      setIsAnnouncement(false)
      
      // Refresh posts and update selected post if it's the one being edited
      fetchPosts()
      if (selectedPost?.id === editingPost.id) {
        const { data } = await supabase
          .from('forum_posts')
          .select('*')
          .eq('id', editingPost.id)
          .single()
        
        if (data) {
          setSelectedPost({ ...data, profiles: selectedPost.profiles })
        }
      }
    } catch (error: any) {
      console.error('Error updating post:', error)
      toast.error('Failed to update post')
    }
  }

  const deletePost = async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    const isAnn = post?.is_announcement
    
    const confirmMessage = isAnn 
      ? '⚠️ Are you sure you want to delete this ANNOUNCEMENT? This will remove it for all users and delete all comments.'
      : 'Are you sure you want to delete this post? This will also delete all comments.'
    
    if (!confirm(confirmMessage)) return

    try {
      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      toast.success(isAnn ? '📢 Announcement deleted!' : '🗑️ Post deleted')
      if (selectedPost?.id === postId) {
        setSelectedPost(null)
      }
      fetchPosts()
    } catch (error: any) {
      console.error('Error deleting post:', error)
      toast.error(isAnn ? 'Failed to delete announcement' : 'Failed to delete post')
    }
  }

  const startEditingComment = (comment: ForumComment) => {
    setEditingCommentId(comment.id)
    setEditingCommentContent(comment.content)
  }

  const cancelEditingComment = () => {
    setEditingCommentId(null)
    setEditingCommentContent('')
  }

  const updateComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) {
      toast.error('Comment cannot be empty')
      return
    }

    try {
      const { error } = await supabase
        .from('forum_comments')
        .update({
          content: editingCommentContent,
        })
        .eq('id', commentId)

      if (error) throw error

      toast.success('✅ Comment updated!')
      setEditingCommentId(null)
      setEditingCommentContent('')
      
      if (selectedPost) {
        fetchComments(selectedPost.id)
      }
    } catch (error: any) {
      console.error('Error updating comment:', error)
      toast.error('Failed to update comment')
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const { error } = await supabase
        .from('forum_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      toast.success('🗑️ Comment deleted')
      if (selectedPost) {
        fetchComments(selectedPost.id)
        fetchPosts() // Refresh to update comment count
      }
    } catch (error: any) {
      console.error('Error deleting comment:', error)
      toast.error('Failed to delete comment')
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'announcement': return <MegaphoneSolid className="h-5 w-5" />
      case 'discussion': return <ChatBubbleLeftRightIcon className="h-5 w-5" />
      case 'question': return <QuestionMarkCircleIcon className="h-5 w-5" />
      case 'idea': return <LightBulbIcon className="h-5 w-5" />
      default: return <ChatBubbleLeftRightIcon className="h-5 w-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'announcement': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
      case 'discussion': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
      case 'question': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
      case 'idea': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ceo': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
      case 'manager': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
      case 'executive_assistant': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  return (
    <div className="container-responsive py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">💬 UPPress Forum</h1>
          <p className="text-sm text-muted-foreground">
            Connect with your team, share ideas, and stay updated
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
          <PlusIcon className="h-5 w-5 mr-2" />
          New Post
        </Button>
      </div>

      {/* Notification Settings */}
      <div className="mb-6">
        <NotificationSettings />
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Category</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('all')}
          >
            All Posts
          </Button>
          <Button
            variant={categoryFilter === 'announcement' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('announcement')}
          >
            <MegaphoneIcon className="h-4 w-4 mr-1" />
            Announcements
          </Button>
          <Button
            variant={categoryFilter === 'discussion' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('discussion')}
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
            Discussions
          </Button>
          <Button
            variant={categoryFilter === 'question' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('question')}
          >
            <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />
            Questions
          </Button>
          <Button
            variant={categoryFilter === 'idea' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('idea')}
          >
            <LightBulbIcon className="h-4 w-4 mr-1" />
            Ideas
          </Button>
        </div>
      </div>

      {/* Period Filter */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Time</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={periodFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('all')}
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            All Time
          </Button>
          <Button
            variant={periodFilter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('today')}
          >
            <ClockIcon className="h-4 w-4 mr-1" />
            Today
          </Button>
          <Button
            variant={periodFilter === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('week')}
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            This Week
          </Button>
          <Button
            variant={periodFilter === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('month')}
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            This Month
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts List */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 sm:py-12 bg-muted/30 rounded-lg border border-border">
              <ChatBubbleLeftRightIcon className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-xs sm:text-sm text-muted-foreground px-4">No posts yet. Be the first to start a conversation!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className={`bg-card border rounded-lg p-3 sm:p-4 transition-all hover:shadow-md ${
                  selectedPost?.id === post.id ? 'border-primary shadow-md' : 'border-border'
                } ${post.is_pinned ? 'border-l-4 border-l-red-500' : ''}`}
              >
                <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                  <div 
                    className="flex items-center gap-1.5 sm:gap-2 flex-wrap flex-1 cursor-pointer"
                    onClick={() => {
                      setSelectedPost(post)
                      fetchComments(post.id)
                    }}
                  >
                    <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${getCategoryColor(post.category)}`}>
                      <span className="hidden sm:inline">{getCategoryIcon(post.category)}</span>
                      {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
                    </span>
                    {post.is_pinned && (
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded-full text-[10px] sm:text-xs font-medium">
                        📌 <span className="hidden xs:inline">Pinned</span>
                      </span>
                    )}
                  </div>
                  
                  {/* Edit/Delete buttons for post owner */}
                  {post.author_id === currentUserId && (
                    <div className={`flex items-center gap-0.5 sm:gap-1 ml-1 sm:ml-2 ${post.is_announcement ? 'bg-red-50 dark:bg-red-900/10 rounded px-1' : ''}`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(post)
                        }}
                        className={`p-1 sm:p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors ${
                          post.is_announcement 
                            ? 'text-blue-700 dark:text-blue-300 font-medium' 
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                        title={post.is_announcement ? "Edit announcement" : "Edit post"}
                      >
                        <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deletePost(post.id)
                        }}
                        className={`p-1 sm:p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors ${
                          post.is_announcement 
                            ? 'text-red-700 dark:text-red-300 font-medium' 
                            : 'text-red-600 dark:text-red-400'
                        }`}
                        title={post.is_announcement ? "Delete announcement" : "Delete post"}
                      >
                        <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedPost(post)
                    fetchComments(post.id)
                  }}
                >
                  <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">{post.content}</p>
                  
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <span className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                        <UserCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{post.profiles?.name || 'Unknown'}</span>
                      </span>
                      <span className={`hidden xs:inline px-1.5 sm:px-2 py-0.5 rounded-full ${getRoleBadgeColor(post.profiles?.role)} flex-shrink-0`}>
                        {post.profiles?.role?.toUpperCase() || 'STAFF'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                      <span className="flex items-center gap-0.5 sm:gap-1">
                        <ChatBubbleLeftRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        {post.comment_count || 0}
                      </span>
                      <span className="hidden sm:flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Post Detail & Comments */}
        <div className="lg:col-span-1">
          {selectedPost ? (
            <div className="bg-card border border-border rounded-lg p-4 sticky top-20">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold pr-8">{selectedPost.title}</h3>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedPost.content}</p>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <UserCircleIcon className="h-4 w-4" />
                  <span>{selectedPost.profiles?.name}</span>
                  <span>•</span>
                  <ClockIcon className="h-4 w-4" />
                  <span>{new Date(selectedPost.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-semibold">Comments ({comments.length})</h4>
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-muted/30 rounded p-3 text-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-medium">{comment.profiles?.name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Edit/Delete buttons for comment owner */}
                      {comment.author_id === currentUserId && (
                        <div className="flex items-center gap-1">
                          {editingCommentId !== comment.id && (
                            <>
                              <button
                                onClick={() => startEditingComment(comment)}
                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400 transition-colors"
                                title="Edit comment"
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => deleteComment(comment.id)}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400 transition-colors"
                                title="Delete comment"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Comment content or edit form */}
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingCommentContent}
                          onChange={(e) => setEditingCommentContent(e.target.value)}
                          className="w-full px-2 py-1 border border-border rounded bg-background text-sm resize-none"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateComment(comment.id)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditingComment}
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <div className="space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm resize-none"
                  rows={3}
                />
                <Button onClick={addComment} className="w-full" size="sm">
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  Post Comment
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 border border-border rounded-lg p-8 text-center">
              <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                Select a post to view details and comments
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create New Post</h2>
              <button onClick={() => {
                setShowCreateModal(false)
                setNewPostTitle('')
                setNewPostContent('')
                setNewPostCategory('discussion')
                setIsAnnouncement(false)
              }}>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  placeholder="Enter post title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="discussion">Discussion</option>
                  <option value="question">Question</option>
                  <option value="idea">Idea</option>
                  <option value="general">General</option>
                </select>
              </div>

              {isCEO && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="announcement"
                    checked={isAnnouncement}
                    onChange={(e) => setIsAnnouncement(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="announcement" className="text-sm font-medium">
                    📢 Mark as Announcement (Pinned)
                  </label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
                  rows={8}
                  placeholder="Write your post content..."
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={createPost} className="flex-1">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  {isAnnouncement ? 'Post Announcement' : 'Create Post'}
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowCreateModal(false)
                  setNewPostTitle('')
                  setNewPostContent('')
                  setNewPostCategory('discussion')
                  setIsAnnouncement(false)
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && editingPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">Edit Post</h2>
                {editingPost.is_announcement && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded-full text-xs font-medium">
                    📢 Announcement
                  </span>
                )}
              </div>
              <button onClick={() => {
                setShowEditModal(false)
                setEditingPost(null)
                setNewPostTitle('')
                setNewPostContent('')
                setNewPostCategory('discussion')
                setIsAnnouncement(false)
              }}>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  placeholder="Enter post title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="discussion">Discussion</option>
                  <option value="question">Question</option>
                  <option value="idea">Idea</option>
                  <option value="general">General</option>
                </select>
              </div>

              {isCEO && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-announcement"
                    checked={isAnnouncement}
                    onChange={(e) => setIsAnnouncement(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="edit-announcement" className="text-sm font-medium">
                    📢 Mark as Announcement (Pinned)
                  </label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
                  rows={8}
                  placeholder="Write your post content..."
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={updatePost} className="flex-1">
                  <PencilIcon className="h-5 w-5 mr-2" />
                  Update Post
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowEditModal(false)
                  setEditingPost(null)
                  setNewPostTitle('')
                  setNewPostContent('')
                  setNewPostCategory('discussion')
                  setIsAnnouncement(false)
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

