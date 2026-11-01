import githubExtension from '@github-tools/eve-extension'
import type { Experimental_EvaluationModel } from 'ai'

const originalFetch = globalThis.fetch

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

globalThis.fetch = async (input, init) => {
  const request = new Request(input, init)
  const url = new URL(request.url)
  if (url.hostname !== 'api.github.com') return originalFetch(input, init)
  if (request.method === 'GET' && url.pathname === '/repos/vercel-labs/github-tools') {
    return json({
      name: 'github-tools',
      full_name: 'vercel-labs/github-tools',
      description: 'stubbed-repo',
      html_url: 'https://github.com/vercel-labs/github-tools',
      default_branch: 'main',
      stargazers_count: 1,
      forks_count: 2,
      open_issues_count: 3,
    })
  }
  if (request.method === 'POST' && url.pathname === '/repos/vercel-labs/github-tools/issues') {
    const { title } = await request.json() as { title: string }
    return json({ number: 4242, title, html_url: 'https://github.com/vercel-labs/github-tools/issues/4242', state: 'open', labels: [], user: { login: 'smoke' } }, 201)
  }
  return json({ message: `Unexpected ${request.method} ${url.pathname}` }, 500)
}

// Answers `preset: 'auto'` routing with issue-triage only.
const routingModel: Experimental_EvaluationModel = {
  specificationVersion: 'v4',
  provider: 'smoke',
  modelId: 'routing-fixture',
  supportedQuestionTypes: ['boolean'],
  async doDecide({ questions }) {
    return {
      answers: Object.fromEntries(Object.keys(questions).map(preset => [
        preset,
        { type: 'boolean' as const, probability: preset === 'issue-triage' ? 0.9 : 0.1 },
      ])),
      warnings: [],
    }
  },
}

export default githubExtension({
  token: 'ghp_smoke',
  preset: 'auto',
  evaluation: { model: routingModel },
  requireApproval: { createIssue: 'once' },
  overrides: { getRepository: { description: 'Smoke: get repository' } },
})
