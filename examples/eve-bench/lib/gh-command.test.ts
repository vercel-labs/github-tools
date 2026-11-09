import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { classifyGh } from './gh-command.ts'

const kind = (command: string) => classifyGh(command.split(' ')).kind

test('runs allowlisted reads on the host', () => {
  for (const command of [
    'pr view 12 --json title',
    'issue list --state open',
    'run view 42 --log-failed',
    'search issues label:bug',
    'api repos/o/r/pulls',
    'api -X GET search/issues -f q=bug',
    'api --method=get repos/o/r',
    'api graphql -f query={viewer{login}}',
  ]) assert.equal(kind(command), 'read', command)
})

test('refuses gh commands that act on the host setup', () => {
  for (const command of ['auth status --show-token', 'auth token', 'config get oauth_token', 'extension install o/r']) {
    assert.equal(kind(command), 'deny', command)
  }
})

test('stubs writes in every flag form', () => {
  for (const command of [
    'pr create --title t',
    'repo delete o/r --yes',
    'api -XDELETE repos/o/r',
    'api -X=DELETE repos/o/r',
    'api --method=DELETE repos/o/r',
    'api -X DELETE repos/o/r',
    'api repos/o/r/issues -f title=t',
    'api repos/o/r/issues --raw-field=title=t',
    'api graphql -f query=mutation{x}',
    'api graphql -f query={a}mutation{x}',
  ]) assert.equal(kind(command), 'write', command)
})

test('refuses gh api inputs it cannot inspect', () => {
  for (const command of [
    'api graphql -F query=@q.graphql',
    'api repos/o/r/issues -F body=@-',
    'api repos/o/r --input body.json',
    'api -iXDELETE repos/o/r',
    'api repos/o/r -H X-HTTP-Method-Override:DELETE',
    'api https://example.com/x',
    'api repos/o/r --verbose',
    'pr view 1 --web',
  ]) assert.equal(kind(command), 'deny', command)
})
