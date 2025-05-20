import { OpenAI } from "openai"

// Allow responses up to 30 seconds
export const maxDuration = 30

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ChatMessage {
  role: string;
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

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

    // --- Use OpenAI Assistants API for retrieval ---
    // 1. Create a thread
    const thread = await openai.beta.threads.create({})
    const threadId = thread.id

    // 2. Add all messages to the thread
    for (const msg of messages) {
      await openai.beta.threads.messages.create(threadId, {
        role: msg.role,
        content: msg.content,
      })
    }

    // 3. Run the assistant on the thread and stream the response
    const runStream = openai.beta.threads.runs.stream(threadId, {
      assistant_id: process.env.ASSISTANT_ID || "",
      // Optionally, you can add more options here
    })

    // 4. Stream the assistant's response back to the client
    const encoder = new TextEncoder()
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of runStream) {
            if (
              'data' in event &&
              event.data &&
              'delta' in event.data &&
              event.data.delta &&
              'content' in event.data.delta
            ) {
              const deltaContent = (event.data.delta as any).content;
              let content = "";
              if (Array.isArray(deltaContent)) {
                deltaContent.forEach((c: any, idx: number) => {
                  console.log("parsed.content item", idx, c, typeof c, Object.keys(c));
                });
                content = deltaContent
                  .map((c: any) => {
                    // If c.text is an object with a value property, use that
                    if (c && typeof c.text === "object" && typeof c.text.value === "string") return c.text.value;
                    // If c.text is a string, use it
                    if (typeof c.text === "string") return c.text;
                    // If c is a string, use it
                    if (typeof c === "string") return c;
                    // Fallback: empty string
                    return "";
                  })
                  .join("");
              } else if (typeof deltaContent === "string") {
                content = deltaContent;
              }
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

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