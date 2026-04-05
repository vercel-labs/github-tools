export function useModels() {
  const models = [
    { label: 'Claude Opus 4.6', value: 'anthropic/claude-opus-4.6', icon: 'i-simple-icons-anthropic' },
    { label: 'Claude Sonnet 4.6', value: 'anthropic/claude-sonnet-4.6', icon: 'i-simple-icons-anthropic' },
    { label: 'Gemini 3 Flash', value: 'google/gemini-3-flash', icon: 'i-simple-icons-google' }
  ]

  const model = useCookie<string>('model', { default: () => 'openai/gpt-5-nano' })
  const durable = useCookie<boolean>('durable', { default: () => false })

  return {
    models,
    model,
    durable
  }
}
