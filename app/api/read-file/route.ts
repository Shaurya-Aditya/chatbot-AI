import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
const pdfParse = require('pdf-parse');

export const config = {
  api: { bodyParser: false },
};

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;

    // ✅ Ensure /tmp exists and write file to disk
    await fs.mkdir('/tmp', { recursive: true });
    const tempPath = path.join('/tmp', file.name);
    await fs.writeFile(tempPath, buffer);

    let text = '';

    if (mimeType === 'application/pdf') {
      const pdfData = await pdfParse(buffer); // or use tempPath with pdfParse if needed
      text = pdfData.text;
    } else if (mimeType === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
      text = buffer.toString('utf-8');
    } else {
      text = 'Unsupported file type.';
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('File parsing failed:', err);
    return new Response(JSON.stringify({
      error: 'Failed to read file',
      details: (err as Error).message || String(err),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
