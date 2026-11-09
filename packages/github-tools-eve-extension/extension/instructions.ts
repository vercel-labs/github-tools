import { resolveToolGuidance } from '@github-tools/sdk/eve-runtime'
import { defineDynamic, defineInstructions } from 'eve/instructions'
import extension from './extension'
import { sessionContext } from './lib/context'

// The extension's config is only known at runtime, so this is dynamic. It depends on the config and
// the GitHub thread, which stay the same in a session, so the provider's prompt cache holds.
export default defineDynamic((ctx) => {
  const { preset } = extension.config
  const guidance = resolveToolGuidance({ preset: preset === 'auto' ? undefined : preset, context: sessionContext(ctx.session.auth.current) })
  // With `'auto'`, the tools that were not picked are deferred, not removed.
  const deferred = preset === 'auto' ? ' A GitHub tool that is not in your tool list can be found with `eve__search`.' : ''
  return defineInstructions({
    content: `GitHub tools: the tool names below leave out this extension's prefix, such as \`github__\`.${deferred}\n\n${guidance}`,
  })
})
