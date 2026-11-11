import { describe, expect, it } from 'vitest'
import { listGithubSkills } from '../eve/build'
import { PRESET_TOOLS, type GithubToolPreset } from './presets'
import { GITHUB_SKILLS, GITHUB_SKILL_NAMES, resolveGithubSkills, type GithubSkill } from './skills'
import { ALL_GITHUB_TOOL_NAMES } from './tool-names'

const skills: Record<string, GithubSkill> = GITHUB_SKILLS

function names(resolved: { name: string }[]) {
  return resolved.map(skill => skill.name)
}

describe('GITHUB_SKILLS', () => {
  it('uses names eve accepts', () => {
    for (const name of GITHUB_SKILL_NAMES) expect(name).toMatch(/^[a-z0-9][a-z0-9_-]{0,63}$/i)
  })

  it('lists exactly the tools each procedure names', () => {
    for (const name of GITHUB_SKILL_NAMES) {
      const { content, tools } = skills[name]!
      const named = ALL_GITHUB_TOOL_NAMES.filter(tool => new RegExp(`\\b${tool}\\b`).test(content))
      expect(named.sort(), name).toEqual([...tools].sort())
    }
  })

  it('requires only tools the procedure names', () => {
    for (const name of GITHUB_SKILL_NAMES) {
      const { requires, tools } = skills[name]!
      expect(tools, name).toEqual(expect.arrayContaining([...requires]))
    }
  })
})

describe('listGithubSkills', () => {
  it('offers every skill with the full catalog', () => {
    expect(names(listGithubSkills())).toEqual(GITHUB_SKILL_NAMES)
    expect(names(listGithubSkills({ preset: 'maintainer' }))).toEqual(GITHUB_SKILL_NAMES)
  })

  it('offers only the skills a preset has the tools for', () => {
    const offered: Record<GithubToolPreset, string[]> = {
      'code-review': ['review-pull-request'],
      'issue-triage': ['triage-issue'],
      'ci-ops': ['diagnose-ci'],
      'repo-explorer': ['review-pull-request', 'diagnose-ci', 'draft-release-notes'],
      'security-audit': ['review-pull-request', 'triage-issue', 'diagnose-ci'],
      'release-manager': ['diagnose-ci', 'draft-release-notes'],
      'discussion-moderator': [],
      'notification-inbox': [],
      'pr-author': [],
      'maintainer': GITHUB_SKILL_NAMES,
    }
    for (const preset of Object.keys(PRESET_TOOLS) as GithubToolPreset[]) {
      expect(names(listGithubSkills({ preset })), preset).toEqual(offered[preset])
    }
  })

  it('follows include and exclude', () => {
    expect(listGithubSkills({ include: ['createIssue', 'addLabels'] })).toEqual([])
    expect(names(listGithubSkills({ preset: 'issue-triage', exclude: ['addLabels'] }))).toEqual([])
    expect(names(listGithubSkills({ preset: 'pr-author', include: ['getCiFailureContext'] }))).toEqual(['diagnose-ci'])
  })

  it('turns skills off', () => {
    expect(listGithubSkills({ skills: false })).toEqual([])
    expect(names(listGithubSkills({ skills: { 'triage-issue': false } }))).toEqual(GITHUB_SKILL_NAMES.filter(name => name !== 'triage-issue'))
  })

  it('adds additionalInstructions after the built-in procedure', () => {
    const [review] = listGithubSkills({ preset: 'code-review', skills: { 'review-pull-request': { additionalInstructions: 'Every change needs a test.' } } })
    expect(review!.content.startsWith(GITHUB_SKILLS['review-pull-request'].content)).toBe(true)
    expect(review!.content.endsWith('Every change needs a test.')).toBe(true)
    expect(review!.description).toBe(GITHUB_SKILLS['review-pull-request'].description)
  })

  it('leaves a skill with no settings unchanged', () => {
    const [review] = resolveGithubSkills(ALL_GITHUB_TOOL_NAMES, { 'review-pull-request': {} })
    expect(review!.content).toBe(GITHUB_SKILLS['review-pull-request'].content)
  })
})
