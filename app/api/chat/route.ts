import { OpenAI } from "openai"

// Allow responses up to 30 seconds
export const maxDuration = 30

const openai = new OpenAI()

export async function POST(req: Request) {
  try {
    const { messages, detailedMode } = await req.json()

    // Get the last message (user's question) exactly as is
    const lastMessage = messages[messages.length - 1]
    
    // Check if this is an image generation request
    const isImageRequest =
      /create|generate|draw|show me|design|make|visualize/i.test(lastMessage.content) &&
      /image|picture|logo|graph|chart|diagram|illustration/i.test(lastMessage.content)

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

    // Create a streaming response with the exact messages
    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content // Use exact content without modification
      })),
      stream: true,
      temperature: detailedMode ? 0.7 : 0.5, // Adjust temperature based on detailed mode
    })

    // Create a TransformStream to handle the streaming response
    const encoder = new TextEncoder()

    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ""
            if (content) {
              // Send the AI's response content without modifying the user's message
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error("Error in chat API:", error)
    return new Response(JSON.stringify({ error: "Failed to process your request" }), { status: 500 })
  }
}