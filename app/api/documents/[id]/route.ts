import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const VECTOR_STORE_ID = 'vs_6824baf19a188191ad264f4a377257ec';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const fileId = params.id;
    await openai.vectorStores.files.del(VECTOR_STORE_ID, fileId);
    await openai.files.del(fileId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to delete file', details: e.message || e.toString() },
      { status: 500 }
    );
    return NextResponse.json(
      { error: 'Failed to delete file', details: e.message || e.toString() },
      { status: 500 }
    );
  }
}


