import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

// Allow responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    // Check if this is an image generation request
    const lastMessage = messages[messages.length - 1].content
    const isImageRequest =
      /create|generate|draw|show me|design|make|visualize/i.test(lastMessage) &&
      /image|picture|logo|graph|chart|diagram|illustration/i.test(lastMessage)

    if (isImageRequest) {
      // In a real implementation, you would call DALL-E 3 here
      // For now, we'll simulate a response
      return new Response(
        JSON.stringify({
          role: "assistant",
          content: "I've generated this image based on your request:",
          type: "image",
          imageUrl: "/placeholder.svg?height=512&width=512",
        }),
        { status: 200 },
      )
    }

    // For text responses, use the AI SDK to stream the response
    const result = streamText({
      model: openai("gpt-4o"),
      messages,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Error in chat API:", error)
    return new Response(JSON.stringify({ error: "Failed to process your request" }), { status: 500 })
  }
}
