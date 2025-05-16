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

    // 3. Run the assistant on the thread and get the full response (not streaming)
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.ASSISTANT_ID || "",
    });

    // 4. Poll for completion and get the messages
    let runStatus = run.status;
    let runId = run.id;
    while (runStatus !== "completed" && runStatus !== "failed" && runStatus !== "cancelled") {
      await new Promise(res => setTimeout(res, 1000));
      const updatedRun = await openai.beta.threads.runs.retrieve(threadId, runId);
      runStatus = updatedRun.status;
    }

    // 5. Get the latest assistant message
    const threadMessages = await openai.beta.threads.messages.list(threadId);
    const assistantMsg = threadMessages.data.find((m: any) => m.role === "assistant");
    let answer = "";
    if (assistantMsg && Array.isArray(assistantMsg.content)) {
      answer = assistantMsg.content
        .map((c: any) => {
          if (c && typeof c.text === "object" && typeof c.text.value === "string") return c.text.value;
          if (typeof c.text === "string") return c.text;
          if (typeof c === "string") return c;
          return "";
        })
        .join("");
    }

    // 6. Check for source/citation references
    const hasSource = /(\[\d+:\d+†source\]|【\d+:\d+†source】)/.test(answer);

    // 7. If no source, fall back to GPT-4
    if (!hasSource) {
      const gpt4 = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages.map((msg: ChatMessage) => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: detailedMode ? 0.7 : 0.5,
      });
      answer = gpt4.choices[0]?.message?.content || "";
    }

    // 8. Stream the answer to the client
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          // Stream the answer in chunks (simulate streaming)
          const chunkSize = 512;
          for (let i = 0; i < answer.length; i += chunkSize) {
            const chunk = answer.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            await new Promise(res => setTimeout(res, 20));
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
    });
  } catch (error) {
    console.error("Error in chat API:", error)
    return new Response(JSON.stringify({ error: "Failed to process your request" }), { status: 500 })
  }
}