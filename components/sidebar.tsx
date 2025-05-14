"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUploader } from "@/components/file-uploader"
import { FileList } from "@/components/file-list"
import { Search } from "lucide-react"
import type { FileCategory } from "@/types/file"

interface SidebarProps {
  isOpen: boolean
}

export function Sidebar({ isOpen }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<FileCategory | "all">("all")

  if (!isOpen) {
    return null
  }

  return (
    <div className="w-full max-w-xs border-r border-border h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search documents..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="documents" className="flex-1 flex flex-col">
        <div className="border-b border-border px-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="documents" className="flex-1 p-0 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={activeCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory("all")}
              >
                All
              </Button>
              <Button
                variant={activeCategory === "business" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory("business")}
              >
                Business
              </Button>
              <Button
                variant={activeCategory === "personal" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory("personal")}
              >
                Personal
              </Button>
              <Button
                variant={activeCategory === "financial" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory("financial")}
              >
                Financial
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <FileList searchQuery={searchQuery} category={activeCategory} />
          </div>
        </TabsContent>

        <TabsContent value="upload" className="flex-1 p-4 flex flex-col">
          <FileUploader />
        </TabsContent>
      </Tabs>
    </div>
  )
}
