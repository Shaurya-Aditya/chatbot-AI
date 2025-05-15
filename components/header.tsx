"use client"

import { Button } from "@/components/ui/button"
import { Menu, User, Upload, Trash2 } from "lucide-react"
import type { SystemStatus } from "@/types/system-status"
import { ModeToggle } from "@/components/mode-toggle"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useState } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useTheme } from "next-themes"

interface HeaderProps {
  systemStatus: SystemStatus
  toggleSidebar: () => void
}

export function Header({ systemStatus, toggleSidebar }: HeaderProps) {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const { theme } = useTheme();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setProfileImage(null)
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        <div className="flex items-center flex-shrink-0">
          <img
            src={theme === 'dark' ? '/dark.webp' : '/light.webp'}
            alt="Logo"
            className="h-10 w-auto"
          />
        </div>
        <div className="flex-1" />
        <div className="ml-auto flex items-center gap-4">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
