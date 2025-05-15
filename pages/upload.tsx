import { useState } from 'react';
import { Header } from '@/components/header';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload-to-vectorstore', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setStatus('Upload successful!');
      } else {
        setStatus('Upload failed.');
      }
    } catch (err) {
      setStatus('Upload failed.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header systemStatus={{status: 'connected', message: 'System ready'}} toggleSidebar={() => {}} />
      <main className="flex-1 flex flex-col items-center justify-center p-4 mt-16">
        <h1 className="text-2xl font-bold mb-4">Upload Document to Vector Store</h1>
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full max-w-md">
          <input type="file" onChange={handleFileChange} className="w-full" />
          <button type="submit" className="px-4 py-2 bg-primary text-white rounded" disabled={!file}>Upload</button>
        </form>
        {status && <p className="mt-4 text-center">{status}</p>}
      </main>
    </div>
  );
} 