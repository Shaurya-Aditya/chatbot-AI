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
import { v4 as uuidv4 } from 'uuid'

interface ChatInterfaceProps {
  onStatusChange: (status: SystemStatus) => void
  messages: Message[]
  setMessages: (updater: (prev: Message[]) => Message[]) => void
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
  onThreadNameUpdate?: (threadName: string) => void
}

export function ChatInterface({ 
  onStatusChange, 
  messages, 
  setMessages, 
  onToggleSidebar,
  sidebarOpen,
  onThreadNameUpdate
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

    // Store the exact user input without any modification
    const userInput = input.trim()
    
    // Create user message with exact content using UUID for unique ID
    const userMessage: Message = {
      id: uuidv4(),
      content: userInput, // Store exact user input
      type: "text",
      role: "user",
      timestamp: new Date(),
    }

    // Add user message immediately with exact content and update thread name if this is the first user message
    setMessages((prev) => {
      const updatedMessages = [...prev];
      // Check if this is the first user message
      const isFirstUserMessage = !updatedMessages.some(msg => msg.role === 'user');
      if (isFirstUserMessage) {
        // Update thread name to first 30 characters of the message
        const threadName = userInput.slice(0, 30) + (userInput.length > 30 ? '...' : '');
        // Update the thread name through the parent component
        if (onThreadNameUpdate) {
          onThreadNameUpdate(threadName);
        }
      }
      updatedMessages.push(userMessage);
      return updatedMessages;
    });

    setInput("") // Clear input after storing
    setIsProcessing(true)
    onStatusChange({ status: "processing", message: "Processing request..." })

    // Create a temporary message ID for the assistant's response using UUID
    const tempMessageId = uuidv4()

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, userMessage], // Send exact user message
          detailedMode
        }),
      })

      if (!response.ok) throw new Error("API error")
      if (!response.body) throw new Error("No response body")

      // Create a temporary message for the assistant's response
      const tempMessage: Message = {
        id: tempMessageId,
        content: "",
        type: "text",
        role: "assistant",
        timestamp: new Date(),
      }

      // Add empty assistant message that we'll update
      setMessages((prev) => {
        const updatedMessages = [...prev];
        updatedMessages.push(tempMessage);
        return updatedMessages;
      });

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                accumulatedContent += parsed.content
                // Update only the AI message content in real-time
                setMessages((prev) =>
                  prev.map((msg) => {
                    // Don't modify user messages
                    if (msg.role === 'user') return msg;
                    // Only update the AI's response
                    return msg.id === tempMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg;
                  })
                )
              }
            } catch (e) {
              console.error("Error parsing streaming response:", e)
            }
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      })
      // Remove only the AI's message on error
      setMessages((prev) => prev.filter((msg) => msg.role !== 'user' && msg.id === tempMessageId))
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
      <div className="p-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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