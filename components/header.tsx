"use client"

import { Button } from "@/components/ui/button"
import { Menu, User } from "lucide-react"
import type { SystemStatus } from "@/types/system-status"
import { ModeToggle } from "@/components/mode-toggle"

interface HeaderProps {
  systemStatus: SystemStatus
  toggleSidebar: () => void
}

export function Header({ systemStatus, toggleSidebar }: HeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>

        <div className="flex items-center">
          <img src="/placeholder.svg?height=32&width=32" alt="Company Logo" className="h-8 w-8 mr-2" />
          <h1 className="text-xl font-semibold">Executive AI</h1>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden md:flex items-center">
            <div
              className={`h-2 w-2 rounded-full mr-2 ${
                systemStatus.status === "connected"
                  ? "bg-green-500"
                  : systemStatus.status === "processing"
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
            />
            <span className="text-sm text-muted-foreground">{systemStatus.message}</span>
          </div>

          <ModeToggle />

          <div className="flex items-center gap-2">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium">John Smith</p>
              <p className="text-xs text-muted-foreground">CEO</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
