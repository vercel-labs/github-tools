/** A node of Nuxt Content's minimark body: `[tag, props, ...children]`, or plain text. */
type MinimarkNode = string | [string, Record<string, unknown>, ...MinimarkNode[]]

type MinimarkBody = { type: string, value: MinimarkNode[] }

function text(node: MinimarkNode): string {
  if (typeof node === 'string') return node
  const [, , ...children] = node
  return children.map(text).join('')
}

function tag(node: MinimarkNode) {
  return typeof node === 'string' ? undefined : node[0]
}

/**
 * Questions and answers from a page's `## FAQ` section: each `###` heading is a question,
 * and the paragraphs and lists under it, up to the next heading, are its answer.
 */
export function faqFromBody(body: MinimarkBody | undefined) {
  const nodes = body?.value ?? []
  const start = nodes.findIndex(node => tag(node) === 'h2' && text(node).trim() === 'FAQ')
  if (start === -1) return []

  const faq: { question: string, answer: string }[] = []
  for (const node of nodes.slice(start + 1)) {
    const name = tag(node)
    if (name === 'h2') break
    if (name === 'h3') {
      faq.push({ question: text(node).trim(), answer: '' })
      continue
    }
    const current = faq.at(-1)
    if (current && (name === 'p' || name === 'ul' || name === 'ol')) {
      current.answer = [current.answer, text(node).trim()].filter(Boolean).join(' ')
    }
  }
  return faq.filter(entry => entry.answer)
}

/** Minutes to read the page's prose at 220 words a minute, code included. */
export function readingMinutes(body: MinimarkBody | undefined) {
  const words = (body?.value ?? []).map(text).join(' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

/** Docs › sidebar group › page, for the BreadcrumbList schema and the top bar. */
export function docsBreadcrumbs(path: string, title: string) {
  const group = docsSidebar.find(entry => entry.items.some(item => item.path === path))
  if (!group) return [{ title: 'Docs', path: '/docs' }, { title, path }]
  return [
    { title: 'Docs', path: '/docs' },
    { title: group.label, path: group.items[0]!.path },
    { title, path }
  ]
}
