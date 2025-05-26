
"use client"

import { useState, useRef } from "react"
import type { Message } from "@/types/message"
import { Button } from "@/components/ui/button"
import { File, FileText, FileSpreadsheet, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Highlighter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const pdfContainerRef = useRef<HTMLDivElement>(null)

  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const isSystem = message.role === "system"

  const getFileIcon = (fileType: string) => {
    if (fileType === "application/pdf") return <File className="h-4 w-4 text-red-500" />
    if (fileType === "text/plain") return <FileText className="h-4 w-4 text-blue-500" />
    if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return <FileSpreadsheet className="h-4 w-4 text-blue-700" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5))
  const handlePageChange = (delta: number) => setCurrentPage((prev) => Math.max(1, prev + delta))

  const renderMessageContent = () => {
    if (message.type === "file" && message.file) {
      // Extract the user query from the message content
      let userQuery = "";
      const match = message.content.match(/User query:([\s\S]*)$/);
      if (match) {
        userQuery = match[1].trim();
      }
      function renderFilePreview(): import("react").ReactNode {
        throw new Error("Function not implemented.")
      }

      return (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2">
            {getFileIcon(message.file.type)}
            <div className="flex flex-col min-w-0">
              <span className={cn("font-medium truncate", isUser ? "text-white" : "text-black dark:text-black")}>
                {message.file.name}
              </span>
              <span className={cn("text-xs", "text-black/70")}>{formatFileSize(message.file.size)}</span>
            </div>
            <a
              href={message.file.url}
              download={message.file.name}
              className="ml-2 text-xs text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
          </div>
          {renderFilePreview()}
          {/* Only show the user query, not the full file content */}
          {userQuery && (
            <div className={cn(
              "mt-2 whitespace-pre-wrap break-words",
              isUser ? "text-white" : "text-black dark:text-black"
            )}>
              {userQuery}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className={cn("whitespace-pre-wrap break-words w-full", "text-black")}>
        {message.content}
      </div>
    )
  }

  return (
    <>
      <div className={cn("flex items-start gap-4 pr-5", isUser ? "flex-row-reverse" : "flex-row", "w-full relative")}>
        <div className={cn("flex flex-col gap-1", isUser ? "items-end ml-auto" : "items-start", "max-w-[85%] w-full")}>
          <div
            className={cn(
              "rounded-2xl px-4 py-2 text-sm break-words",
              isUser ? "bg-gray-200 text-black" : "bg-white text-black",
              isSystem && "bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100",
              "shadow-sm",
              isUser ? "ml-auto" : "",
              "w-fit"
            )}
            style={{
              wordBreak: "break-word",
              overflowWrap: "break-word",
              maxWidth: "100%",
              position: "relative"
            }}
          >
            {renderMessageContent()}
          </div>
        </div>
      </div>

      {message.type === "file" && message.file?.type === "application/pdf" && (
        <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="text-black dark:text-black">{message.file.name}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handleZoomOut}><ZoomOut className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={handleZoomIn}><ZoomIn className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => handlePageChange(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm text-black dark:text-black">Page {currentPage}</span>
                  <Button variant="outline" size="icon" onClick={() => handlePageChange(1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div ref={pdfContainerRef} className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 rounded-lg" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
              <iframe src={`${message.file.url}#page=${currentPage}`} className="w-full h-full" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
} 