"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { File, FileText, FileSpreadsheet, MoreVertical, Trash2, FolderInput, Eye, Download } from "lucide-react"
import type { FileCategory, FileItem, FileType } from "@/types/file"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface FileListProps {
  searchQuery: string
  category?: FileCategory | "all"
}

export function FileList({ searchQuery, category }: FileListProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [undownloadableIds, setUndownloadableIds] = useState<string[]>([])
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function fetchFiles() {
      setLoading(true)
      setError(null)
      try {
        console.log('Fetching files from API...');
        const res = await fetch("/api/documents")
        const data = await res.json()
        console.log('API response:', data);
        
        if (!res.ok) {
          throw new Error(data.details || data.error || `HTTP error! status: ${res.status}`);
        }
        
        if (!data.success) {
          throw new Error(data.error || "Failed to fetch files");
        }
        
        if (!Array.isArray(data.files)) {
          console.error('Invalid files data:', data);
          throw new Error("Invalid response format from server");
        }
        
        const mapped: FileItem[] = (data.files || []).map((file: any) => ({
          id: file.id,
          name: file.filename || file.name || "Untitled",
          type: (file.filename || file.name || "").split('.').pop() as FileType || "pdf",
          size: file.bytes ? file.bytes : 0,
          uploadedAt: file.created_at ? new Date(file.created_at * 1000) : new Date(),
        }))
        console.log('Mapped files:', mapped);
        setFiles(mapped)
      } catch (e: any) {
        console.error('Error fetching files:', e);
        setError(e.message || "Unknown error occurred while fetching files");
        toast({
          title: "Error loading documents",
          description: e.message || "Could not load your documents. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false)
      }
    }
    fetchFiles()
  }, [toast])

  const handleView = (id: string) => {
    router.push(`/documents/${id}`)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to delete file')
      setFiles(files.filter((file) => file.id !== id))
      toast({
        title: "File deleted",
        description: "The file has been removed from your knowledge base.",
      })
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e.message || 'Could not delete file',
        variant: 'destructive',
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  const handleDownload = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}/download`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404 && data.error && data.error.includes('Download is not available')) {
          toast({
            title: "Download not available",
            description: data.error,
            variant: 'destructive',
          })
          setUndownloadableIds((prev) => [...prev, id])
          return;
        }
        if (res.status === 400 && data.details && data.details.includes('Not allowed to download files of purpose: assistants')) {
          toast({
            title: "Download not allowed",
            description: "Download is not available for files uploaded to the vector store.",
            variant: 'destructive',
          })
          setUndownloadableIds((prev) => [...prev, id])
          return;
        }
        throw new Error('Failed to download file')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      let filename = 'document'
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      }
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      toast({
        title: "Download failed",
        description: e.message || 'Could not download file',
        variant: 'destructive',
      })
    }
  }

  const handleChangeCategory = (id: string, newCategory: FileCategory) => {
    setFiles(files.map((file) => (file.id === id ? { ...file, category: newCategory } : file)))
    toast({
      title: "Category updated",
      description: "The file category has been updated.",
    })
  }

  const getFileIcon = (fileType: FileType) => {
    switch (fileType) {
      case "pdf":
        return <File className="h-5 w-5 text-red-500" />
      case "txt":
        return <FileText className="h-5 w-5 text-blue-500" />
      case "docx":
        return <FileSpreadsheet className="h-5 w-5 text-blue-700" />
      default:
        return <File className="h-5 w-5" />
    }
  }

  const filteredFiles = files.filter((file) => {
    const searchTerm = (searchQuery || "").toLowerCase()
    const matchesSearch = file.name.toLowerCase().includes(searchTerm) ||
                         file.type.toLowerCase().includes(searchTerm)
    return matchesSearch
  })

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-destructive">{error}</div>
  }

  return (
    <div className="space-y-4">
      {filteredFiles.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No files found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center p-3 rounded-md border border-border hover:bg-accent/50 transition-colors"
            >
              <div className="mr-3">{getFileIcon(file.type)}</div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>{formatFileSize(file.size)}</span>
                  <span className="mx-1">•</span>
                  <span>{formatDistanceToNow(file.uploadedAt, { addSuffix: true })}</span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDelete(file.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
