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
    <>
      <Header systemStatus={systemStatus} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="border-b border-border w-full" />
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
      <div className="pt-4 h-screen">
        <main className="h-full">
          <ChatInterface
            onStatusChange={setSystemStatus}
            messages={messages}
            setMessages={() => {}}
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
    </>
  )
}
