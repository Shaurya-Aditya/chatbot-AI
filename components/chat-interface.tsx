"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, MicOff, Paperclip, Loader2, Menu, X, FileText, StopCircle } from "lucide-react"
import type { Message } from "@/types/message"
import type { SystemStatus } from "@/types/system-status"
import { ChatMessage } from "@/components/chat-message"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from 'uuid'
import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from "@/types/speech-recognition"

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
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (typeof window !== 'undefined' && SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI()
      recognitionRef.current = recognition
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('')
          setInput(transcript)
        }

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error)
          toast({
            title: "Voice Input Error",
            description: "There was an error with voice recognition. Please try again.",
            variant: "destructive",
          })
          setIsRecording(false)
        }

        recognitionRef.current.onend = () => {
          setIsRecording(false)
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [toast])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleStopStreaming = () => {
    if (abortController) {
      abortController.abort()
      setIsStreaming(false)
      setIsProcessing(false)
      onStatusChange({ status: "connected", message: "System ready" })
    }
  }

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedFile) || isProcessing) return

    // Create user message with content and file if present
    const userMessage: Message = {
      id: uuidv4(),
      content: input.trim(),
      type: selectedFile ? "file" : "text",
      role: "user",
      timestamp: new Date(),
      file: selectedFile ? {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        url: URL.createObjectURL(selectedFile)
      } : undefined
    }

    // Add user message immediately
    setMessages((prev) => {
      const updatedMessages = [...prev]
      const isFirstUserMessage = !updatedMessages.some(msg => msg.role === 'user')
      if (isFirstUserMessage && input.trim()) {
        const threadName = input.trim().slice(0, 30) + (input.trim().length > 30 ? '...' : '')
        if (onThreadNameUpdate) {
          onThreadNameUpdate(threadName)
        }
      }
      updatedMessages.push(userMessage)
      return updatedMessages
    })

    setInput("")
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setIsProcessing(true)
    setIsStreaming(true)
    onStatusChange({ status: "processing", message: "Processing request..." })

    // Create a new AbortController for this request
    const controller = new AbortController()
    setAbortController(controller)

    // Create a temporary message ID for the assistant's response using UUID
    const tempMessageId = uuidv4()

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          detailedMode: true
        }),
        signal: controller.signal
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
              let newContent = "";
              if (Array.isArray(parsed.content)) {
                newContent = parsed.content
                  .filter((c: any) => typeof c.text === "string")
                  .map((c: any) => c.text)
                  .join("");
              } else if (typeof parsed.content === "string") {
                newContent = parsed.content;
              }
              console.log("Parsed content from stream:", parsed.content);
              console.log("Accumulated content before update:", accumulatedContent);
              if (newContent) {
                accumulatedContent += newContent;
                console.log("Accumulated content after update:", accumulatedContent);
                // Update only the AI message content in real-time
                setMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.role === 'user') return msg;
                    return msg.id === tempMessageId
                      ? { ...msg, content: String(accumulatedContent) }
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
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Don't remove the message on abort, just stop streaming
        setIsStreaming(false)
        setIsProcessing(false)
        onStatusChange({ status: "connected", message: "System ready" })
      } else {
        toast({
          title: "Error",
          description: "Failed to process your request. Please try again.",
          variant: "destructive",
        })
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId))
      }
    } finally {
      setIsProcessing(false)
      setIsStreaming(false)
      setAbortController(null)
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
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      toast({
        title: "Voice Input Not Supported",
        description: "Your browser doesn't support voice input. Please use a modern browser.",
        variant: "destructive",
      })
      return
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognitionAPI()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognitionRef.current = recognition
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      try {
        recognitionRef.current?.start()
        setIsRecording(true)
        toast({
          title: "Voice Input Started",
          description: "Speak now. Click the microphone button again to stop.",
        })
      } catch (error) {
        console.error('Error starting speech recognition:', error)
        toast({
          title: "Voice Input Error",
          description: "Could not start voice input. Please try again.",
          variant: "destructive",
        })
      }
    }
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
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-w-2 scrollbar-track-blue-lighter scrollbar-thumb-blue scrollbar-thumb-rounded">
        <div className="max-w-3xl mx-auto w-full">
          {messages.map((message) => (
            <div key={message.id} className="mb-6">
              <ChatMessage message={message} />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {isProcessing && (
          <div className="flex items-center justify-center text-sm text-muted-foreground mb-2">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span>{isStreaming ? "AI is responding..." : "Processing..."}</span>
          </div>
        )}

        {isRecording && (
          <div className="flex items-center justify-center text-sm text-red-500 mb-2">
            <Mic className="h-3 w-3 animate-pulse mr-1" />
            <span>Listening...</span>
          </div>
        )}

        <div className="max-w-3xl mx-auto w-full relative">
          {selectedFile && (
            <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-lg">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm truncate flex-1">{selectedFile.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.txt,.doc,.docx"
          />

          <Textarea
            placeholder="Type your message..."
            className="min-h-[80px] resize-none pr-24 rounded-2xl"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
          />

          <div className="absolute right-3 bottom-3 flex items-center space-x-2">
            

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleVoiceInput} 
              disabled={isProcessing} 
              title={isRecording ? "Stop voice input" : "Start voice input"}
              className={isRecording ? "text-red-500" : ""}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span className="sr-only">{isRecording ? "Stop voice input" : "Start voice input"}</span>
            </Button>

            {isStreaming ? (
              <Button
                onClick={handleStopStreaming}
                className="rounded-full bg-red-500 hover:bg-red-600 text-white"
                size="icon"
                title="Stop AI response"
              >
                <StopCircle className="h-4 w-4" />
                <span className="sr-only">Stop</span>
              </Button>
            ) : (
              <Button
                onClick={handleSendMessage}
                disabled={(!input.trim() && !selectedFile) || isProcessing || isRecording}
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground dark:bg-[#2d2d2d] dark:hover:bg-[#3d3d3d]"
                size="icon"
                title="Send message"
              >
                <Send className="h-4 w-4 text-white" />
                <span className="sr-only">Send</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}