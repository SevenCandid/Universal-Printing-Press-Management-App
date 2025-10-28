'use client'

import { useEffect, useState, useRef } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

type CompanyFile = {
  name: string
  id: string
  created_at: string
  updated_at: string
  metadata?: {
    size?: number
    mimetype?: string
    lastModified?: number
    eTag?: string
  }
}

export default function FilesBase({ role }: { role: string }) {
  const { supabase, session } = useSupabase()
  const [files, setFiles] = useState<CompanyFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ====== Permissions ======
  const canUpload = () => ['ceo', 'manager', 'executive_assistant', 'staff'].includes(role?.toLowerCase() || '')
  const canDelete = () => ['ceo', 'manager', 'executive_assistant'].includes(role?.toLowerCase() || '')

  // ====== Fetch Files ======
  const fetchFiles = async () => {
    if (!supabase) return

    setLoading(true)
    try {
      const { data, error } = await supabase.storage.from('company_files').list()

      if (error) throw error

      setFiles((data || []) as CompanyFile[])
    } catch (err) {
      console.error('Fetch files error:', err)
      toast.error('Failed to fetch files')
    } finally {
      setLoading(false)
    }
  }

  // ====== Upload File ======
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return
    if (!supabase) return toast.error('Client not ready')

    setUploading(true)
    try {
      for (const file of Array.from(selectedFiles)) {
        const filePath = `${Date.now()}-${file.name}`
        const { error } = await supabase.storage.from('company_files').upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

        if (error) throw error
      }

      // Create notification for file upload
      await supabase.from('notifications').insert({
        title: '📎 File Uploaded',
        message: `${selectedFiles.length} file(s) uploaded to company storage`,
        type: 'file',
        link: '/files',
        user_role: 'ceo,manager',
        read: false,
      })

      toast.success(`${selectedFiles.length} file(s) uploaded successfully`)
      fetchFiles()

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Failed to upload files')
    } finally {
      setUploading(false)
    }
  }

  // ====== Download File ======
  const handleDownload = async (fileName: string) => {
    if (!supabase) return
    try {
      const { data } = await supabase.storage.from('company_files').createSignedUrl(fileName, 60)

      if (data?.signedUrl) {
        const link = document.createElement('a')
        link.href = data.signedUrl
        link.download = fileName
        link.click()
        toast.success('Download started')
      }
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Failed to download file')
    }
  }

  // ====== Delete File ======
  const handleDelete = async (fileName: string) => {
    if (!canDelete()) return toast.error('You do not have permission to delete files')
    if (!supabase) return
    if (!confirm(`Delete ${fileName}?`)) return

    try {
      const { error } = await supabase.storage.from('company_files').remove([fileName])

      if (error) throw error

      // Create notification for file deletion
      await supabase.from('notifications').insert({
        title: '🗑️ File Deleted',
        message: `${fileName} has been deleted from company storage`,
        type: 'file',
        link: '/files',
        user_role: 'ceo,manager',
        read: false,
      })

      toast.success('File deleted')
      fetchFiles()
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete file')
    }
  }

  // ====== Filter Files ======
  const filteredFiles = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))

  // ====== Format File Size ======
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(2)} KB`
    return `${(kb / 1024).toFixed(2)} MB`
  }

  // ====== Format Date ======
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return 'Unknown date'
    }
  }

  // ====== Effects ======
  useEffect(() => {
    if (!supabase || !session) return
    fetchFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, session])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Company File Storage</h1>
            <p className="text-sm text-muted-foreground">
              Upload, download, and manage company files
              {role && <span className="ml-2 text-xs text-gray-500">(Role: {role})</span>}
            </p>
          </div>
          {canUpload() && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2"
            >
              <CloudArrowUpIcon className="h-5 w-5" />
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleUpload}
          className="hidden"
          accept="*/*"
        />
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">Loading files...</CardContent>
          </Card>
        ) : filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <DocumentIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {search ? 'No files match your search' : 'No files uploaded yet'}
              </p>
              {canUpload() && !search && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="mt-4"
                >
                  Upload Your First File
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredFiles.map((file) => (
            <Card key={file.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                      <DocumentIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 truncate" title={file.name}>
                        {file.name}
                      </h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Size: {formatFileSize(file.metadata?.size)}</p>
                        <p>Uploaded: {formatDate(file.created_at)}</p>
                        {file.metadata?.mimetype && <p>Type: {file.metadata.mimetype}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      onClick={() => handleDownload(file.name)}
                      variant="outline"
                      size="sm"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </Button>
                    {canDelete() && (
                      <Button
                        onClick={() => handleDelete(file.name)}
                        variant="destructive"
                        size="sm"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      {filteredFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold">{filteredFiles.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-2xl font-bold">
                  {formatFileSize(filteredFiles.reduce((sum, f) => sum + (f.metadata?.size || 0), 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Latest Upload</p>
                <p className="text-sm font-medium mt-2">
                  {formatDate(filteredFiles[0]?.created_at || '')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

