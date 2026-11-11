import { listGithubSkills, type GithubSkillName, type ResolvedGithubSkill } from '@github-tools/sdk/eve-runtime'
import { defineSkill } from 'eve/skills'
import extension from '../extension'

const TOOL_NOTE = 'Tool names in this procedure leave out this extension\'s prefix, such as `github__`. When a step names a tool you don\'t have, skip the step and say so.'

/** The skills this mount offers. With `preset: 'auto'`, every tool is registered, listed or deferred. */
export function offeredSkills(): ResolvedGithubSkill[] {
  const { preset, include, exclude, skills } = extension.config
  return listGithubSkills(preset === 'auto' ? { exclude, skills } : { preset, include, exclude, skills })
}

export function githubSkill(name: GithubSkillName) {
  const skill = offeredSkills().find(entry => entry.name === name)
  return skill ? defineSkill({ description: skill.description, content: `${TOOL_NOTE}\n\n${skill.content}` }) : null
}
