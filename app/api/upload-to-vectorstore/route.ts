import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';

const VECTOR_STORE_ID = 'vs_6824baf19a188191ad264f4a377257ec';
const MAPPING_FILE = path.resolve(process.cwd(), 'vector-file-mapping.json');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Step 1: Upload file to OpenAI's file endpoint
    const uploadedFile = await openai.files.create({
      file,
      purpose: "assistants"
    });
    // Step 2: Add the uploaded file to the vector store
    const response = await openai.vectorStores.files.create(VECTOR_STORE_ID, {
      file_id: uploadedFile.id,
    });

    // Step 3: Save mapping to local JSON file
    const mapping = {
      vector_store_file_id: response.id,
      original_file_id: uploadedFile.id,
      filename: (file as File).name || 'unknown',
      created_at: Date.now(),
    };
    let mappings: any[] = [];
    try {
      const data = await fs.readFile(MAPPING_FILE, 'utf-8');
      mappings = JSON.parse(data);
    } catch (e) {
      // File may not exist yet
      mappings = [];
    }
    mappings.push(mapping);
    await fs.writeFile(MAPPING_FILE, JSON.stringify(mappings, null, 2), 'utf-8');

    return NextResponse.json({ success: true, data: response }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Upload failed', details: e.message || e.toString() }, { status: 500 });
  }
} 