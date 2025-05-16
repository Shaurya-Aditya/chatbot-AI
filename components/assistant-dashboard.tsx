"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import type { SystemStatus } from "@/types/system-status"
import type { Message, MessageType, MessageRole } from "@/types/message"
import { v4 as uuidv4 } from 'uuid'
import { useEffect } from "react"

export function AssistantDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: "connected",
    message: "System ready",
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const defaultAssistantMessage = {
    id: "1",
    content: "Hello! I'm your AI assistant. How can I help you today?",
    type: "text" as MessageType,
    role: "assistant" as MessageRole,
    timestamp: new Date(),
  };

  const [threads, setThreads] = useState([
    {
      id: uuidv4(),
      name: "New Chat",
      messages: [defaultAssistantMessage],
    },
  ]);
  const [selectedThreadId, setSelectedThreadId] = useState(threads[0].id);

  const handleNewChat = () => {
    const newThread = {
      id: uuidv4(),
      name: "New Chat",
      messages: [
        {
          ...defaultAssistantMessage,
          id: Date.now().toString(),
          timestamp: new Date(),
          type: "text" as MessageType,
          role: "assistant" as MessageRole,
        },
      ],
    };
    setThreads((prev) => [...prev, newThread]);
    setSelectedThreadId(newThread.id);
  };

  const setMessages = (updater: (prev: Message[]) => Message[]) => {
    setThreads((prevThreads) =>
      prevThreads.map((thread) =>
        thread.id === selectedThreadId
          ? {
              ...thread,
              messages: (() => {
                const updatedMessages = typeof updater === 'function' 
                  ? updater(thread.messages)
                  : updater;
                
                // Update thread name if this is the first user message
                if (updatedMessages.length > 0) {
                  const firstUserMessage = updatedMessages.find(msg => msg.role === 'user');
                  if (firstUserMessage && thread.name.startsWith('Thread')) {
                    // Use first 30 characters of the message as thread name
                    const newName = firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
                    thread.name = newName;
                  }
                }

                // Ensure user messages are preserved exactly as they were
                return updatedMessages.map((msg: Message) => {
                  if (msg.role === 'user') {
                    return {
                      ...msg,
                      content: msg.content // Preserve exact user input
                    };
                  }
                  return msg;
                });
              })()
            }
          : thread
      )
    );
  };

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  const handleDeleteThread = (id: string) => {
    setThreads((prev) => prev.filter((thread) => thread.id !== id));
    // If the deleted thread was selected, select another
    if (selectedThreadId === id && threads.length > 1) {
      const nextThread = threads.find((t) => t.id !== id);
      if (nextThread) setSelectedThreadId(nextThread.id);
    }
  };

  const handleRenameThread = (id: string, newName: string) => {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === id ? { ...thread, name: newName } : thread
      )
    );
  };

  const handleThreadNameUpdate = (newName: string) => {
    handleRenameThread(selectedThreadId, newName);
  };

  return (
    <div className="flex h-screen flex-col">
      <Header systemStatus={systemStatus} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          isOpen={sidebarOpen}
          onNewChat={handleNewChat}
          threads={threads}
          selectedThreadId={selectedThreadId}
          setSelectedThreadId={setSelectedThreadId}
          onRenameThread={handleRenameThread}
          onDeleteThread={handleDeleteThread}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-hidden transition-all duration-300">
          <ChatInterface
            onStatusChange={setSystemStatus}
            messages={selectedThread ? selectedThread.messages : []}
            setMessages={setMessages}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
            onThreadNameUpdate={handleThreadNameUpdate}
          />
        </main>
      </div>
    </div>
  )
}
