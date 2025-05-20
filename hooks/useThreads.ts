import { useState, useEffect, useCallback } from "react";

interface Thread {
  id: string;
  name: string;
  created_at?: string;
}

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all threads
  const fetchThreads = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/threads");
    const data = await res.json();
    console.log("[useThreads] API /api/threads response:", data);
    // Ensure threads is always an array
    setThreads(Array.isArray(data) ? data : []);
    console.log("[useThreads] threads state set to:", Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  // Create a new thread
  const createThread = async (name: string) => {
    const res = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const newThread = await res.json();
    console.log("[useThreads] API /api/threads POST response:", newThread);
    setThreads((prev) => [newThread, ...prev]);
    return newThread;
  };

  // Rename a thread
  const renameThread = async (id: string, name: string) => {
    const res = await fetch(`/api/threads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const updated = await res.json();
    console.log("[useThreads] API /api/threads/PUT response:", updated);
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: updated.name } : t))
    );
  };

  // Delete a thread
  const deleteThread = async (id: string) => {
    await fetch(`/api/threads/${id}`, { method: "DELETE" });
    setThreads((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return {
    threads,
    loading,
    fetchThreads,
    createThread,
    renameThread,
    deleteThread,
  };
} 