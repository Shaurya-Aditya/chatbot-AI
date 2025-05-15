"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, Paperclip, Loader2, Menu } from "lucide-react"
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      type: "text",
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsProcessing(true)
    onStatusChange({ status: "processing", message: "Processing request..." })

    try {
      // Send the message to the backend API
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      })

      if (!res.ok) throw new Error("API error")

      // If your backend streams, you may want to handle streaming here.
      // For now, we'll assume a simple JSON response.
      const data = await res.json()

      const responseMessage: Message = {
        id: Date.now().toString(),
        content: data.content || "No response from AI.",
        type: data.type || "text",
        role: "assistant",
        timestamp: new Date(),
        imageUrl: data.imageUrl,
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
    toast({
      title: "Attach file",
      description: "You can reference uploaded files in your conversation.",
    })
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

        <div className="max-w-3xl mx-auto w-full relative">
          <Textarea
            placeholder="Type your message..."
            className="min-h-[80px] resize-none pr-24 rounded-2xl"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
          />

          <div className="absolute right-3 bottom-3 flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={handleAttachFile} disabled={isProcessing} title="Attach file">
              <Paperclip className="h-4 w-4" />
              <span className="sr-only">Attach file</span>
            </Button>

            <Button variant="ghost" size="icon" onClick={handleVoiceInput} disabled={isProcessing} title="Voice input">
              <Mic className="h-4 w-4" />
              <span className="sr-only">Voice input</span>
            </Button>

            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isProcessing}
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