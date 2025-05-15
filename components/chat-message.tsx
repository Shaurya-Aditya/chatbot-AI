"use client"

import { useState } from "react"
import type { Message } from "@/types/message"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Copy, Check, User, Bot, Maximize2, Minimize2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const isUser = message.role === "user"

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleExpand = () => {
    setExpanded(!expanded)
  }

  return (
    <div className={cn("flex w-full gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <Bot className="h-4 w-4" />
        </Avatar>
      )}

      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start", "max-w-[85%]")}>
        <Card className={cn(
          "p-4 rounded-2xl",
          isUser 
            ? "bg-muted dark:bg-[#2d2d2d] text-foreground dark:text-white" 
            : "bg-background dark:bg-[hsl(var(--chat-background)_/_0.6)]"
        )}>
          {message.type === "text" && (
            <div
              className={cn(
                "prose prose-sm dark:prose-invert max-w-none",
                expanded ? "" : "max-h-[300px] overflow-hidden",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}

          {message.type === "image" && (
            <div className="space-y-2">
              <p>{message.content}</p>
              <div className="mt-2 rounded-md overflow-hidden border border-border">
                <img
                  src={message.imageUrl || "/placeholder.svg"}
                  alt="Generated image"
                  className="w-full h-auto max-h-[300px] object-contain"
                />
              </div>
            </div>
          )}

          {message.content.length > 300 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpand}
              className={cn(
                "mt-2 h-6 px-2 text-xs",
                isUser ? "text-primary-foreground/80 hover:text-primary-foreground/100 hover:bg-primary/80" : "",
              )}
            >
              {expanded ? (
                <>
                  <Minimize2 className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <Maximize2 className="h-3 w-3 mr-1" />
                  Show more
                </>
              )}
            </Button>
          )}
        </Card>

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{format(message.timestamp, "h:mm a")}</span>

          {!isUser && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span className="sr-only">Copy message</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
