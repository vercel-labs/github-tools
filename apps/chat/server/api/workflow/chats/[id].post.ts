import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, generateText } from 'ai'
import { start } from 'workflow/api'
import { z } from 'zod'
import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import type { UIMessage } from 'ai'
import { durableChatWorkflow } from '../../../workflows/chat'

defineRouteMeta({
  openAPI: {
    description: 'Chat with AI using a durable workflow agent.',
    tags: ['ai', 'workflow']
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
      model: 'openai/gpt-4o-mini',
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

  const additionalInstructions = [
    session.user?.username ? `The user's name is ${session.user.username}.` : '',
    '**FORMATTING RULES (CRITICAL):**',
    '- ABSOLUTELY NO MARKDOWN HEADINGS: Never use #, ##, ###, ####, #####, or ######',
    '- NO underline-style headings with === or ---',
    '- Use **bold text** for emphasis and section labels instead',
    '- Start all responses with content, never with a heading'
  ].filter(Boolean).join('\n')

  const modelMessages = await convertToModelMessages(messages)
  const maxSteps = token ? 20 : 5

  const run = await start(durableChatWorkflow, [modelMessages, token || '', model, additionalInstructions, maxSteps])

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      if (!chat.title && !isContinuation) {
        writer.write({ type: 'data-chat-title', data: { message: 'Generating title...' }, transient: true })
      }
      writer.merge(run.readable)
    },
    onFinish: async ({ responseMessage, isContinuation: isCont }) => {
      if (isCont) {
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
