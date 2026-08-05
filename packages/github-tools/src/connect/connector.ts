/**
 * A Vercel Connect connector name, or a resolver that returns one.
 *
 * Use a function to pick the connector dynamically — e.g. a different
 * connector per environment (`production` vs. `preview`) or per tenant.
 * It's resolved lazily, on every token request, alongside the token itself.
 */
export type GithubConnectorInput = string | (() => string | Promise<string>)

/** Resolves a {@link GithubConnectorInput} to a connector name string. */
export async function resolveGithubConnector(connector: GithubConnectorInput): Promise<string> {
  return typeof connector === 'function' ? await connector() : connector
}
