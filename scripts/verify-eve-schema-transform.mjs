import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  createSourceFile,
  forEachChild,
  isCallExpression,
  isIdentifier,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isShorthandPropertyAssignment,
  ScriptKind,
  ScriptTarget,
} from 'typescript'

const bundlePath = process.argv[2]
assert.ok(bundlePath, 'Usage: node scripts/verify-eve-schema-transform.mjs <bundle>')

const source = createSourceFile(
  bundlePath,
  readFileSync(bundlePath, 'utf8'),
  ScriptTarget.Latest,
  true,
  ScriptKind.JS,
)
const durableSchemas = new Set()

function propertyName(node) {
  return isIdentifier(node) ? node.text : undefined
}

function walk(node) {
  if (
    isPropertyAssignment(node)
    && ['inputSchema', 'outputSchema'].includes(propertyName(node.name))
    && isCallExpression(node.initializer)
    && isIdentifier(node.initializer.expression)
    && node.initializer.expression.text === 'defineDurableSchema'
  ) {
    const key = propertyName(node.name)
    const options = node.initializer.arguments[0]
    assert.ok(options && isObjectLiteralExpression(options), `${key} must configure defineDurableSchema() inline`)

    const closure = options.properties.find(prop =>
      isPropertyAssignment(prop) && propertyName(prop.name) === 'closure',
    )
    assert.ok(closure && isPropertyAssignment(closure) && isObjectLiteralExpression(closure.initializer), `${key} must set an inline closure`)
    assert.equal(closure.initializer.properties.length, 1, `${key} closure must contain only name`)
    const name = closure.initializer.properties[0]
    assert.ok(isShorthandPropertyAssignment(name) && name.name.text === 'name', `${key} closure must contain only name`)

    durableSchemas.add(key)
  }

  forEachChild(node, walk)
}

walk(source)
assert.deepEqual([...durableSchemas].sort(), ['inputSchema', 'outputSchema'])
