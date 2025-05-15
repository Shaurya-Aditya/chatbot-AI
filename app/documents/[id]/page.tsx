"use client";
import { use, useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function DocumentViewer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchDocument() {
      try {
        const res = await fetch(`/api/documents/${id}/download`);
        if (!res.ok) throw new Error('Failed to fetch document');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setDocumentUrl(url);
        if (blob.type === 'application/pdf') {
          setTotalPages(1);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load document');
        toast({
          title: "Error",
          description: e.message || 'Could not load document',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchDocument();
  }, [id, toast]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handlePageChange = (delta: number) => {
    setCurrentPage(prev => Math.max(1, Math.min(prev + delta, totalPages)));
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/documents/${id}/download`);
      if (!res.ok) throw new Error('Failed to download document');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({
        title: "Download failed",
        description: e.message || 'Could not download document',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background dark:bg-black">
        <Header systemStatus={{status: 'connected', message: 'System ready'}} toggleSidebar={() => {}} />
        <main className="flex-1 flex items-center justify-center p-4 mt-16">
          <div className="text-center">
            <p className="text-muted-foreground">Loading document...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background dark:bg-black">
        <Header systemStatus={{status: 'connected', message: 'System ready'}} toggleSidebar={() => {}} />
        <main className="flex-1 flex items-center justify-center p-4 mt-16">
          <div className="text-center">
            <p className="text-destructive">{error}</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Documents
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background dark:bg-black">
      <Header systemStatus={{status: 'connected', message: 'System ready'}} toggleSidebar={() => {}} />
      <main className="flex-1 flex flex-col p-4 mt-16">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documents
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-lg shadow-lg overflow-hidden">
          {documentUrl && (
            <iframe
              src={`${documentUrl}#page=${currentPage}`}
              className="w-full h-full"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            />
          )}
        </div>
      </main>
    </div>
  );
} 