'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { CameraIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.replace('/login')
        return
      }

      setUser(user)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, role, avatar_url, email')
        .eq('id', user.id)
        .single()

      if (profileError) {
        toast.error('Error loading profile')
      } else {
        setProfile(profileData)
      }
      setLoading(false)
    }

    fetchProfile()
  }, [router])

  const handleUpdate = async () => {
    if (!profile) return
    const { error } = await supabase
      .from('profiles')
      .update({
        name: profile.name,
        role: profile.role,
        avatar_url: profile.avatar_url,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to update profile')
    } else {
      toast.success('Profile updated successfully')
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      toast.error('Failed to upload image')
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const publicUrl = data.publicUrl

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      toast.error('Failed to update avatar')
    } else {
      setProfile({ ...profile, avatar_url: publicUrl })
      toast.success('Avatar updated')
    }
    setUploading(false)
  }

  const handleAvatarRemove = async () => {
    if (!profile) return
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to remove avatar')
    } else {
      setProfile({ ...profile, avatar_url: null })
      toast.success('Avatar removed')
    }
  }

  if (loading) return <div className="p-6 text-center">Loading profile...</div>

  const isCEO = localStorage.getItem('role') === 'ceo'

  return (
    <div className="container max-w-lg mx-auto py-10">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back
      </Button>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center space-y-3">
            <Image
              src={profile?.avatar_url || '/assets/avatar-default.png'}
              alt="Profile"
              width={96}
              height={96}
              className="rounded-full border object-cover"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <CameraIcon className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </Button>
              {profile?.avatar_url && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleAvatarRemove}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={profile?.name || ''}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Enter your name"
            />
          </div>

          {/* Email (readonly) */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <Input value={user?.email || ''} readOnly disabled />
          </div>

          {/* Role (CEO editable) */}
          {isCEO ? (
            <div className="space-y-1">
              <label className="text-sm font-medium">Role</label>
              <select
                className="w-full border rounded-md p-2 text-sm"
                value={profile?.role || 'staff'}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              >
                <option value="ceo">CEO</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="board">Board</option>
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-sm font-medium">Role</label>
              <Input value={profile?.role || ''} readOnly disabled />
            </div>
          )}

          <Button onClick={handleUpdate} className="w-full">
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
