import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const VECTOR_STORE_ID = 'vs_6824baf19a188191ad264f4a377257ec';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: NextRequest) {
  try {
    // List files in the vector store
    const filesResponse = await openai.vectorStores.files.list(VECTOR_STORE_ID);
    const vectorFiles = filesResponse.data;

    // For each file, fetch its metadata from OpenAI files endpoint
    const filesWithNames = await Promise.all(
      vectorFiles.map(async (file: any) => {
        let filename = 'Untitled';
        try {
          const fileMeta = await openai.files.retrieve(file.id);
          filename = fileMeta.filename || 'Untitled';
        } catch (e) {
          // If metadata fetch fails, fallback to Untitled
        }
        return {
          ...file,
          filename,
          bytes: file.usage_bytes, // for compatibility with frontend
          created_at: file.created_at,
        };
      })
    );

    return NextResponse.json({ success: true, files: filesWithNames }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch documents', details: e.message || e.toString() }, { status: 500 });
  }
} 