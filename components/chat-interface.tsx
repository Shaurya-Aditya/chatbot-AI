"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, Paperclip, Loader2, Menu, File, FileText, FileSpreadsheet } from "lucide-react"
import type { Message } from "@/types/message"
import type { SystemStatus } from "@/types/system-status"
import { ChatMessage } from "@/components/chat-message"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface ChatInterfaceProps {
  onStatusChange: (status: SystemStatus) => void
  messages: Message[]
  setMessages: (updater: (prev: Message[]) => Message[]) => void
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
}

export function ChatInterface({ 
  onStatusChange, 
  messages, 
  setMessages, 
  onToggleSidebar,
  sidebarOpen 
}: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [detailedMode, setDetailedMode] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validFileTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    if (!validFileTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, TXT, and DOCX files are supported.",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)
    setFilePreview(URL.createObjectURL(file))
  }

  const handleRemoveFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview)
    }
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedFile) || isProcessing) return

    let messageContent = input.trim()
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      type: selectedFile ? "file" : "text",
      role: "user",
      timestamp: new Date(),
      ...(selectedFile && {
        file: {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          url: filePreview!,
        }
      })
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setIsProcessing(true)
    onStatusChange({ status: "processing", message: "Processing request..." })

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      let responseMessage: Message
      if (selectedFile?.type === "application/pdf") {
        responseMessage = {
          id: Date.now().toString(),
          content: `I've received your PDF "${selectedFile.name}"${messageContent ? ` along with your message: "${messageContent}"` : ""}. I can help you analyze or work with this document. What would you like to know about it?`,
          type: "text",
          role: "assistant",
          timestamp: new Date(),
        }
      } else {
        responseMessage = {
          id: Date.now().toString(),
          content: detailedMode 
            ? "Here's a detailed response that provides comprehensive information about your query."
            : "Here's a concise answer to your question.",
          type: "text",
          role: "assistant",
          timestamp: new Date(),
        }
      }

      setMessages((prev) => [...prev, responseMessage])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      onStatusChange({ status: "connected", message: "System ready" })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleAttachFile = () => {
    fileInputRef.current?.click()
  }

  const handleVoiceInput = () => {
    toast({
      title: "Voice input",
      description: "Voice input feature is coming soon.",
    })
  }

  return (
    <div className="flex flex-col h-full chat-background">
      {/* Chat Header */}
      <div className="border-b border-border p-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="hidden md:flex"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open sidebar</span>
            </Button>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center space-x-2">
          <Switch id="detailed-mode" checked={detailedMode} onCheckedChange={setDetailedMode} />
          <Label htmlFor="detailed-mode" className="text-sm">
            Detailed responses
          </Label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-w-2 scrollbar-track-blue-lighter scrollbar-thumb-blue scrollbar-thumb-rounded">
        <div className="max-w-3xl mx-auto w-full">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {isProcessing && (
          <div className="flex items-center justify-center text-sm text-muted-foreground mb-2">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span>Processing...</span>
          </div>
        )}

        {selectedFile && (
          <div className="max-w-3xl mx-auto w-full mb-2 p-2 bg-muted rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                ({formatFileSize(selectedFile.size)})
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              className="h-6 px-2"
            >
              Remove
            </Button>
          </div>
        )}

        <div className="max-w-3xl mx-auto w-full relative">
          <Textarea
            placeholder={selectedFile ? "Add a message with your file..." : "Type your message..."}
            className="min-h-[80px] resize-none pr-24 rounded-2xl"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
          />

          <div className="absolute right-3 bottom-3 flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.txt,.docx"
              onChange={handleFileChange}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleAttachFile} 
              disabled={isProcessing} 
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
              <span className="sr-only">Attach file</span>
            </Button>

            <Button variant="ghost" size="icon" onClick={handleVoiceInput} disabled={isProcessing} title="Voice input">
              <Mic className="h-4 w-4" />
              <span className="sr-only">Voice input</span>
            </Button>

            <Button
              onClick={handleSendMessage}
              disabled={(!input.trim() && !selectedFile) || isProcessing}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground dark:bg-[#2d2d2d] dark:hover:bg-[#3d3d3d]"
              size="icon"
            >
              <Send className="h-4 w-4 text-white" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
