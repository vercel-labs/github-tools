import { defineSandbox } from 'eve/sandbox'
import { JustBashSandbox } from 'eve/sandbox/just-bash'
import { benchSelection } from '../lib/configs.ts'
import { ghCommand } from '../lib/gh-command.ts'

// Only the `cli` config has the bash tool, so only it opens this sandbox.
const { config, level } = benchSelection()
export const environment = JustBashSandbox.environment({ experimental: { customCommands: [ghCommand({ config, level })] } })
export default defineSandbox(() => environment.open())
