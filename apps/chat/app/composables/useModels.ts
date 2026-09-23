export function useModels() {
  const models = [
    { label: 'Claude Opus 5.5', value: 'anthropic/claude-opus-5.5', icon: 'i-simple-icons-anthropic' },
    { label: 'GPT-6 Sol', value: 'openai/gpt-6-sol', icon: 'i-simple-icons-openai' },
    { label: 'Gemini 3.8 Flash', value: 'google/gemini-3.8-flash', icon: 'i-simple-icons-google' }
  ]

  const model = useCookie<string>('model', { default: () => 'anthropic/claude-opus-5.5' })
  const durable = useCookie<boolean>('durable', { default: () => false })

  return {
    models,
    model,
    durable
  }
}
