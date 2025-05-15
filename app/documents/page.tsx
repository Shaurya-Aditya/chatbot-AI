"use client";
import { useState } from 'react';
import { Header } from '@/components/header';
import { Input } from '@/components/ui/input';
import { FileList } from '@/components/file-list';
import { Search } from 'lucide-react';

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-background dark:bg-black">
      <Header systemStatus={{status: 'connected', message: 'System ready'}} toggleSidebar={() => {}} />
      <main className="flex-1 flex flex-col items-center p-4 mt-16">
        <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 flex flex-col gap-6 border border-border dark:border-zinc-800 transition-all">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold text-center text-foreground dark:text-white tracking-tight">Your Documents</h1>
            <p className="text-center text-muted-foreground dark:text-zinc-400">Manage and organize your uploaded documents</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <FileList searchQuery={searchQuery} />
        </div>
      </main>
    </div>
  );
}
