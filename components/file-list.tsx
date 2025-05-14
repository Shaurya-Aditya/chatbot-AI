"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { File, FileText, FileSpreadsheet, MoreVertical, Trash2, FolderInput } from "lucide-react"
import type { FileCategory, FileItem, FileType } from "@/types/file"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface FileListProps {
  searchQuery: string
  category: FileCategory | "all"
}

export function FileList({ searchQuery, category }: FileListProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const { toast } = useToast()

  // Simulate fetching files from API
  useEffect(() => {
    // In a real application, you would fetch files from your API
    const mockFiles: FileItem[] = [
      {
        id: "1",
        name: "Q1 Financial Report.pdf",
        type: "pdf",
        category: "financial",
        size: 2.4,
        uploadedAt: new Date(2023, 2, 15),
      },
      {
        id: "2",
        name: "Business Plan 2023.docx",
        type: "docx",
        category: "business",
        size: 1.8,
        uploadedAt: new Date(2023, 1, 10),
      },
      {
        id: "3",
        name: "Meeting Notes.txt",
        type: "txt",
        category: "business",
        size: 0.3,
        uploadedAt: new Date(2023, 3, 5),
      },
      {
        id: "4",
        name: "Personal Goals.docx",
        type: "docx",
        category: "personal",
        size: 0.5,
        uploadedAt: new Date(2023, 0, 20),
      },
      {
        id: "5",
        name: "Investment Strategy.pdf",
        type: "pdf",
        category: "financial",
        size: 3.2,
        uploadedAt: new Date(2023, 4, 8),
      },
    ]

    setFiles(mockFiles)
  }, [])

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = category === "all" || file.category === category
    return matchesSearch && matchesCategory
  })

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

  const handleDelete = (id: string) => {
    setFiles(files.filter((file) => file.id !== id))
    toast({
      title: "File deleted",
      description: "The file has been removed from your knowledge base.",
    })
  }

  const handleChangeCategory = (id: string, newCategory: FileCategory) => {
    setFiles(files.map((file) => (file.id === id ? { ...file, category: newCategory } : file)))
    toast({
      title: "Category updated",
      description: "The file category has been updated.",
    })
  }

  if (filteredFiles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No files found</p>
      </div>
    )
  }

  return (
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
              <span className="capitalize">{file.category}</span>
              <span className="mx-1">•</span>
              <span>{file.size} MB</span>
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

              <DropdownMenuItem
                onClick={() => handleChangeCategory(file.id, "business")}
                disabled={file.category === "business"}
              >
                <FolderInput className="mr-2 h-4 w-4" />
                <span>Move to Business</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleChangeCategory(file.id, "personal")}
                disabled={file.category === "personal"}
              >
                <FolderInput className="mr-2 h-4 w-4" />
                <span>Move to Personal</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleChangeCategory(file.id, "financial")}
                disabled={file.category === "financial"}
              >
                <FolderInput className="mr-2 h-4 w-4" />
                <span>Move to Financial</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  )
}
