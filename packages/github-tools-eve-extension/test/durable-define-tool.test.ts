import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  createSourceFile,
  forEachChild,
  isArrowFunction,
  isCallExpression,
  isFunctionExpression,
  isIdentifier,
  isMethodDeclaration,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isShorthandPropertyAssignment,
  isSpreadAssignment,
  ScriptTarget,
  type CallExpression,
  type Expression,
  type Node,
  type ObjectLiteralExpression,
} from 'typescript'

// Every callback phase eve stamps a durable descriptor for
// (`collectDurableDynamicToolCallbacks`). `execute` is the only required one.
const CALLBACKS = ['execute', 'toModelOutput', 'approval', 'approvalKey', 'label'] as const
const REQUIRED_CALLBACKS = ['execute'] as const
const LABEL_CALLBACKS = ['start', 'delta', 'complete'] as const
const SCHEMAS = ['inputSchema', 'outputSchema'] as const
const sourcePath = join(dirname(fileURLToPath(import.meta.url)), '../extension/tools/github.ts')

function walk(node: Node, visit: (node: Node) => void) {
  visit(node)
  forEachChild(node, child => walk(child, visit))
}

function propertyName(name: Node): string | undefined {
  return isIdentifier(name) ? name.text : undefined
}

function isDirectFunction(init: Expression | Node): boolean {
  return isArrowFunction(init) || isFunctionExpression(init) || isIdentifier(init) || isMethodDeclaration(init)
}

function collectDefineToolCalls(root: Node): CallExpression[] {
  const calls: CallExpression[] = []
  walk(root, (node) => {
    if (isCallExpression(node) && isIdentifier(node.expression) && node.expression.text === 'defineTool') {
      calls.push(node)
    }
  })
  return calls
}

function collectSchemaInitializers(root: Node): Map<string, Expression[]> {
  const schemas = new Map<string, Expression[]>()
  walk(root, (node) => {
    if (!isPropertyAssignment(node)) return
    const key = propertyName(node.name)
    if (!key || !(SCHEMAS as readonly string[]).includes(key)) return
    const values = schemas.get(key) ?? []
    values.push(node.initializer)
    schemas.set(key, values)
  })
  return schemas
}

function assertDurableSchema(init: Expression, key: string) {
  assert.ok(
    isCallExpression(init)
    && isIdentifier(init.expression)
    && init.expression.text === 'defineDurableSchema',
    `defineTool().${key} must use defineDurableSchema(), not ${init.kind}`,
  )

  const options = init.arguments[0]
  assert.ok(options && isObjectLiteralExpression(options), `defineTool().${key} must configure defineDurableSchema() inline`)
  const closure = options.properties.find(prop => isPropertyAssignment(prop) && propertyName(prop.name) === 'closure')
  assert.ok(closure && isPropertyAssignment(closure) && isObjectLiteralExpression(closure.initializer), `defineTool().${key} must set an inline closure`)
  assert.equal(closure.initializer.properties.length, 1, `defineTool().${key} closure must contain only name`)
  const name = closure.initializer.properties[0]
  assert.ok(isShorthandPropertyAssignment(name) && name.name.text === 'name', `defineTool().${key} closure must contain only name`)

  const schema = options.properties.find(prop => isPropertyAssignment(prop) && propertyName(prop.name) === 'schema')
  assert.ok(schema && isPropertyAssignment(schema) && isIdentifier(schema.initializer), `defineTool().${key} schema must be a module-level function`)
}

function callbackKeysInSpread(spread: Expression, sourceText: (node: Node) => string): string[] {
  const keys: string[] = []
  if (isObjectLiteralExpression(spread)) {
    for (const inner of spread.properties) {
      if (isPropertyAssignment(inner)) {
        const key = propertyName(inner.name)
        if (key && (CALLBACKS as readonly string[]).includes(key)) keys.push(key)
      }
    }
    return keys
  }
  const text = sourceText(spread)
  for (const key of CALLBACKS) {
    if (new RegExp(`\\b${key}\\s*:`).test(text)) keys.push(key)
  }
  return keys
}

function inspectDefineToolObject(arg: ObjectLiteralExpression, sourceText: (node: Node) => string) {
  const spreadKeys: string[] = []
  const direct = new Map<string, Expression | Node>()

  for (const prop of arg.properties) {
    if (isSpreadAssignment(prop)) {
      spreadKeys.push(...callbackKeysInSpread(prop.expression, sourceText))
      continue
    }
    if (isPropertyAssignment(prop)) {
      const key = propertyName(prop.name)
      if (key) direct.set(key, prop.initializer)
      continue
    }
    if (isMethodDeclaration(prop)) {
      const key = propertyName(prop.name)
      if (key) direct.set(key, prop)
    }
  }

  return { spreadKeys, direct }
}

function assertLabelCallbacksInline(label: Expression | Node) {
  if (!isObjectLiteralExpression(label)) {
    assert.ok(
      isDirectFunction(label),
      'defineTool().label must be an object literal or an inline function',
    )
    return
  }

  for (const prop of label.properties) {
    assert.ok(
      !isSpreadAssignment(prop),
      'defineTool().label must not spread its callbacks — eve cannot stamp a durable descriptor',
    )
    const key = isPropertyAssignment(prop) || isMethodDeclaration(prop) ? propertyName(prop.name) : undefined
    if (!key || !(LABEL_CALLBACKS as readonly string[]).includes(key)) continue
    const init = isPropertyAssignment(prop) ? prop.initializer : prop
    assert.ok(
      isDirectFunction(init),
      `defineTool().label.${key} must be an inline function or identifier, not ${init.kind}`,
    )
  }
}

describe('defineTool durable callbacks and schemas', () => {
  it('authors every durable callback as a direct inline function', () => {
    const text = readFileSync(sourcePath, 'utf8')
    const source = createSourceFile(sourcePath, text, ScriptTarget.Latest, true)
    const calls = collectDefineToolCalls(source)
    assert.ok(calls.length > 0, 'expected at least one defineTool() call in github.ts')

    const sourceText = (node: Node) => node.getText(source)

    for (const call of calls) {
      const arg = call.arguments[0]
      assert.ok(arg && isObjectLiteralExpression(arg), 'defineTool() must take an object literal')

      const { spreadKeys, direct } = inspectDefineToolObject(arg, sourceText)
      assert.deepEqual(
        spreadKeys,
        [],
        `defineTool() must not spread ${spreadKeys.join(', ')} — eve cannot stamp a durable descriptor`,
      )

      for (const key of REQUIRED_CALLBACKS) {
        assert.ok(direct.get(key), `defineTool() must set ${key} as a direct property`)
      }

      for (const key of CALLBACKS) {
        const init = direct.get(key)
        if (!init) continue
        if (key === 'label') {
          assertLabelCallbacksInline(init)
          continue
        }
        assert.ok(
          isDirectFunction(init),
          `defineTool().${key} must be an inline function or identifier, not ${init.kind}`,
        )
      }
    }
  })

  it('wraps every live schema in defineDurableSchema', () => {
    const text = readFileSync(sourcePath, 'utf8')
    const source = createSourceFile(sourcePath, text, ScriptTarget.Latest, true)
    const calls = collectDefineToolCalls(source)
    assert.ok(calls.length > 0, 'expected at least one defineTool() call in github.ts')

    for (const call of calls) {
      const arg = call.arguments[0]
      assert.ok(arg && isObjectLiteralExpression(arg), 'defineTool() must take an object literal')
      const schemas = collectSchemaInitializers(arg)
      assert.ok(schemas.get('inputSchema')?.length, 'defineTool() must set inputSchema')
      for (const [key, initializers] of schemas) {
        for (const init of initializers) {
          assertDurableSchema(init, key)
        }
      }
    }
  })
})
