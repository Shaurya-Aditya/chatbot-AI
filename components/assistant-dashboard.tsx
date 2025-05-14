"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import type { SystemStatus } from "@/types/system-status"

export function AssistantDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: "connected",
    message: "System ready",
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen flex-col">
      <Header systemStatus={systemStatus} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} />
        <main className="flex-1 overflow-hidden">
          <ChatInterface onStatusChange={setSystemStatus} />
        </main>
      </div>
    </div>
  )
}
