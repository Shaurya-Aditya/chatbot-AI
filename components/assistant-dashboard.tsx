"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import type { SystemStatus } from "@/types/system-status"
import { useThreads } from "@/hooks/useThreads"
import { useMessages } from "@/hooks/useMessages"

export function AssistantDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: "connected",
    message: "System ready",
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(undefined)

  const { 
    threads, 
    loading: threadsLoading, 
    createThread, 
    renameThread, 
    deleteThread 
  } = useThreads()

  const { 
    messages, 
    loading: messagesLoading, 
    addMessage 
  } = useMessages(selectedThreadId)

  const handleNewChat = async () => {
    const newThread = await createThread("New Chat")
    setSelectedThreadId(newThread.id)
  }

  const handleDeleteThread = async (id: string) => {
    await deleteThread(id)
    if (selectedThreadId === id) {
      setSelectedThreadId(undefined)
    }
  }

  const handleRenameThread = async (id: string, newName: string) => {
    await renameThread(id, newName)
  }

  const handleThreadNameUpdate = async (newName: string) => {
    if (selectedThreadId) {
      await renameThread(selectedThreadId, newName)
    }
  }

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
        <main className={`flex-1 overflow-hidden transition-all duration-300${sidebarOpen ? ' md:ml-[260px]' : ''}`}>
          <ChatInterface
            onStatusChange={setSystemStatus}
            messages={selectedThreadId ? messages : []}
            setMessages={() => {}} // Not needed as we use addMessage
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
            onThreadNameUpdate={handleThreadNameUpdate}
            addMessage={addMessage}
            selectedThreadId={selectedThreadId}
            setSelectedThreadId={setSelectedThreadId}
            createThread={createThread}
          />
        </main>
      </div>
    </div>
  )
}
