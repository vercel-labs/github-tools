import { resolveToolGuidance } from '@github-tools/sdk/eve-runtime'
import { defineDynamic, defineInstructions } from 'eve/instructions'
import extension from './extension'

// The extension's config is only known at runtime, so this is dynamic. It depends on the config
// alone, so the system prompt stays the same across model calls and the provider's cache holds.
export default defineDynamic(() => {
  const { preset, context } = extension.config
  const guidance = resolveToolGuidance({ preset: preset === 'auto' ? undefined : preset, context })
  // With `'auto'`, the tools that were not picked are deferred, not removed.
  const deferred = preset === 'auto' ? ' A GitHub tool that is not in your tool list can be found with `eve__search`.' : ''
  return defineInstructions({
    content: `GitHub tools: the tool names below leave out this extension's prefix, such as \`github__\`.${deferred}\n\n${guidance}`,
  })
})
