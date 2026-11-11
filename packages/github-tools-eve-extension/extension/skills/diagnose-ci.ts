import { defineDynamic } from 'eve/skills'
import { githubSkill } from '../lib/skills'

export default defineDynamic(() => githubSkill('diagnose-ci'))
