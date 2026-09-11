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

describe('defineTool durable callbacks', () => {
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
})
