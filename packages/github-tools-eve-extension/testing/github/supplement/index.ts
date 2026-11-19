import type { SupplementContext } from './context.js'
import { registerGists } from './gists.js'
import { registerGraphql } from './graphql.js'
import { registerNotifications } from './notifications.js'
import { registerReactions } from './reactions.js'
import { registerRepositoryRoutes } from './repository.js'
import { registerSecurityAlerts } from './security.js'
import { registerStatuses } from './statuses.js'
import { registerSubIssues } from './sub-issues.js'
import { fixWebhookPayloads } from './webhooks.js'

export type { SupplementContext } from './context.js'
export type { SecurityAlertSeeds } from './security.js'

/**
 * What `@github-tools/sdk` calls and emulate 0.13.1 doesn't answer. Each part can move to
 * emulate, and `testing/coverage.test.ts` fails with "delete this route" once emulate has it.
 *
 * The routes are registered before emulate's, because its router takes the first route that
 * matches and its `/commits/:ref{.+}` would answer `/commits/{ref}/status`.
 */
export function registerSupplementRoutes(context: SupplementContext, unknownDocuments: string[]) {
  registerReactions(context)
  registerStatuses(context)
  registerRepositoryRoutes(context)
  registerSubIssues(context)
  registerGists(context)
  return {
    seedAlerts: registerSecurityAlerts(context),
    notify: registerNotifications(context),
    discussions: registerGraphql(context, unknownDocuments),
  }
}

export { fixWebhookPayloads }
