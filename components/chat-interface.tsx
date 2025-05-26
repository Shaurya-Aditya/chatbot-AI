
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
  addMessage?: (role: string, content: string) => Promise<any>
  selectedThreadId?: string
  setSelectedThreadId?: (id: string) => void
  createThread?: (name: string) => Promise<any>
}

// Debounce utility
function debounce(fn: (...args: any[]) => void, delay: number) {
  let timer: NodeJS.Timeout | null = null;
  return (...args: any[]) => {
    if (timer) return;
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

export function ChatInterface({ 
  onStatusChange, 
  messages, 
  setMessages, 
  onToggleSidebar,
  sidebarOpen,
  onThreadNameUpdate,
  addMessage,
  selectedThreadId,
  setSelectedThreadId,
  createThread
}: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [sendLocked, setSendLocked] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const { toast } = useToast()
  const prevThreadIdRef = useRef<string | undefined>(selectedThreadId)

  const sendMessageAndGetAIResponse = async (userMessageContent: string) => {
    let threadId = selectedThreadId;
    // Add user message to backend if addMessage is provided
    if (addMessage && threadId) {
      await addMessage("user", userMessageContent)
    }

    // Get the last message we just added (which contains the file content)
    const lastMessage = messages[messages.length - 1];
    
    setIsProcessing(true)
    setIsStreaming(true)
    onStatusChange({ status: "processing", message: "Processing request..." })

    // Create a new AbortController for this request
    const controller = new AbortController()
    setAbortController(controller)

    // Create a temporary message ID for the assistant's response using UUID
    const tempMessageId = uuidv4()

    try {
      console.log('Sending to AI:', lastMessage.content);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages],
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
              if (newContent) {
                accumulatedContent += newContent;
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

      // After streaming is complete, save the assistant's message to Supabase
      if (addMessage) {
        await addMessage("assistant", accumulatedContent)
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
  };

  const debouncedSend = debounce(() => {
    setSendLocked(true)
    Promise.resolve(handleSendMessage()).finally(() => setSendLocked(false))
  }, 1000)

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

  useEffect(() => {
    // If a new thread was just created and there's a pending message, send it
    if (
      pendingMessage &&
      prevThreadIdRef.current !== selectedThreadId &&
      selectedThreadId &&
      addMessage
    ) {
      sendMessageAndGetAIResponse(pendingMessage);
      setPendingMessage(null);
      prevThreadIdRef.current = selectedThreadId;
    }
  }, [selectedThreadId, pendingMessage, addMessage]);

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
    if ((!input.trim() && !selectedFile) || isProcessing) return;

    let userMessage: Message;
    let fullMessage = input.trim();

    if (selectedFile) {
      // 1. Read the file content
      const formData = new FormData();
      formData.append('file', selectedFile);
      let fileText = "";
      try {
        const res = await fetch('/api/read-file', { method: 'POST', body: formData });
        if (res.ok) {
          const { text } = await res.json();
          fileText = text;
        }
      } catch (e) {
        // handle error
      }
      // 2. Construct the message content
      fullMessage = `Attached file (${selectedFile.name}):\n\n${fileText}\n\nUser query: ${input.trim()}`;
      userMessage = {
        id: uuidv4(),
        content: fullMessage,
        type: "file",
        role: "user",
        timestamp: new Date(),
        file: {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          url: URL.createObjectURL(selectedFile),
        },
      };
    } else {
      userMessage = {
        id: uuidv4(),
        content: fullMessage,
        type: "text",
        role: "user",
        timestamp: new Date(),
      };
    }
    setMessages((prev) => [...prev, userMessage]);

    // 2. Prepare the message history to send to the AI
    const messageHistory = [...messages, userMessage];

    // 3. Call the AI endpoint
    setIsProcessing(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messageHistory, detailedMode: true }),
      });

      if (!response.ok) throw new Error("AI API error");

      // Stream the AI response and accumulate content
      let accumulatedContent = "";
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (reader && !done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                let newContent = "";
                if (Array.isArray(parsed.content)) {
                  newContent = parsed.content
                    .filter((c: any) => typeof c.text === "string")
                    .map((c: any) => c.text)
                    .join("");
                } else if (typeof parsed.content === "string") {
                  newContent = parsed.content;
                }
                if (newContent) {
                  accumulatedContent += newContent;
                  // Optionally, you can show streaming updates here
                }
              } catch (e) {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }
      }

      // 4. Add the AI's response to the UI
      const aiMessage: Message = {
        id: uuidv4(),
        content: accumulatedContent || "[No response]",
        type: "text",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      // Handle error (show toast, etc.)
      toast({
        title: "Error",
        description: "Failed to get AI response.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setInput("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendLocked && !isProcessing) {
        debouncedSend();
      }
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
    <div className="flex flex-col h-full chat-background relative">
      {/* Chat Header - Fixed position */}
      <div className="fixed top-0 left-0 right-0 border-b border-border p-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
        {/* Logo on the left */}
        <div className="flex items-center gap-2">
          <img src="/light.webp" alt="Logo" className="h-8 w-auto" />
        </div>
        <div className="flex-1" />
      </div>

      {/* Messages Container - Fixed position below header */}
      <div className="flex-1 overflow-y-auto p-4 pt-20 pb-24 space-y-4">
        <div className="max-w-3xl mx-auto w-full">
          {messages.map((message, idx) => (
            <div key={message.id} className={idx === 0 ? "" : "mb-6"}>
              <ChatMessage message={message} />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Container - Fixed position at bottom */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
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
            disabled={isProcessing || sendLocked}
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
                disabled={(!input.trim() && !selectedFile) || isProcessing || isRecording || sendLocked}
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