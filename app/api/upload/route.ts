import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]
    const category = formData.get("category") as string

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Process each file
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        // In a real implementation, you would:
        // 1. Upload the file to storage
        // 2. Extract text from the file
        // 3. Generate embeddings using OpenAI
        // 4. Store the embeddings in a vector database

        // For now, we'll just return file metadata
        return {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.name.split(".").pop()?.toLowerCase(),
          category,
          size: file.size / (1024 * 1024), // Convert to MB
          uploadedAt: new Date(),
        }
      }),
    )

    return NextResponse.json({ files: processedFiles }, { status: 200 })
  } catch (error) {
    console.error("Error in upload API:", error)
    return NextResponse.json({ error: "Failed to process uploaded files" }, { status: 500 })
  }
}
