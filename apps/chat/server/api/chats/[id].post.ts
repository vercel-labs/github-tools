import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, generateText, stepCountIs } from 'ai'
import { createGithubAgent } from '@github-tools/sdk'
import { z } from 'zod'
import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import type { UIMessage } from 'ai'

defineRouteMeta({
  openAPI: {
    description: 'Chat with AI.',
    tags: ['ai']
  }
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string()
  }).parse)

  const { model, messages } = await readValidatedBody(event, z.object({
    model: z.string(),
    messages: z.array(z.custom<UIMessage>())
  }).parse)

  const { githubToken: configToken } = useRuntimeConfig()
  const token = session.secure?.githubToken ?? configToken

  const agent = createGithubAgent({
    model,
    token: token || '',
    additionalInstructions: [
      session.user?.username ? `The user's name is ${session.user.username}.` : '',
      '**FORMATTING RULES (CRITICAL):**',
      '- ABSOLUTELY NO MARKDOWN HEADINGS: Never use #, ##, ###, ####, #####, or ######',
      '- NO underline-style headings with === or ---',
      '- Use **bold text** for emphasis and section labels instead',
      '- Start all responses with content, never with a heading'
    ].filter(Boolean).join('\n'),
    stopWhen: stepCountIs(token ? 20 : 5),
    providerOptions: {
      openai: { reasoningEffort: 'low', reasoningSummary: 'detailed' },
      google: { thinkingConfig: { includeThoughts: true, thinkingBudget: 2048 } }
    }
  })

  const chat = await db.query.chats.findFirst({
    where: () => and(
      eq(schema.chats.id, id as string),
      eq(schema.chats.userId, session.user?.id || session.id)
    ),
    with: { messages: true }
  })
  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  const lastMessage = messages[messages.length - 1]
  const isContinuation = lastMessage?.role === 'assistant'

  if (!chat.title && !isContinuation) {
    const { text: title } = await generateText({
      model: 'anthropic/claude-opus-5.5',
      system: `You are a title generator for a chat:
          - Generate a short title based on the first user's message
          - The title should be less than 30 characters long
          - The title should be a summary of the user's message
          - Do not use quotes (' or ") or colons (:) or any other punctuation
          - Do not use markdown, just plain text`,
      prompt: JSON.stringify(messages[0])
    })
    await db.update(schema.chats).set({ title }).where(eq(schema.chats.id, id as string))
  }

  if (lastMessage?.role === 'user' && messages.length > 1) {
    await db.insert(schema.messages).values({
      chatId: id as string,
      role: 'user',
      parts: lastMessage.parts
    })
  }

  const modelMessages = await convertToModelMessages(messages)

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const result = await agent.stream({ messages: modelMessages })

      if (!chat.title && !isContinuation) {
        writer.write({ type: 'data-chat-title', data: { message: 'Generating title...' }, transient: true })
      }

      writer.merge(result.toUIMessageStream({
        sendReasoning: true,
        onError: (error: unknown) => String(error)
      }))
    },
    onFinish: async ({ responseMessage, isContinuation }) => {
      if (isContinuation) {
        const lastDbAssistant = chat.messages
          .filter(m => m.role === 'assistant')
          .pop()
        if (lastDbAssistant) {
          await db.update(schema.messages)
            .set({ parts: responseMessage.parts })
            .where(eq(schema.messages.id, lastDbAssistant.id))
        }
      } else {
        await db.insert(schema.messages).values({
          chatId: chat.id,
          role: responseMessage.role as 'user' | 'assistant',
          parts: responseMessage.parts
        })
      }
    }
  })

  return createUIMessageStreamResponse({ stream })
})
