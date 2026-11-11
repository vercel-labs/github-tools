import { spawnSync } from 'node:child_process'

// Runs the evals with the redirect taken out of NODE_OPTIONS after `setup`. `emulateGithub` has
// to stop the run before the first eval, with a message that names the cause.
const run = spawnSync('pnpm', ['exec', 'eve', 'eval', '--skip-report'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, EVAL_WITHOUT_REDIRECT: '1' },
  encoding: 'utf8',
})
const output = `${run.stdout}${run.stderr}`
const failures = [
  run.status === 0 && 'the run passed',
  !output.includes('started without the redirect to the emulators') && 'the output has no probe message',
  /^[✓✗] /mu.test(output) && 'an eval ran',
].filter(Boolean)

if (failures.length > 0) {
  console.error(`A run without the redirect should fail before the first eval, and ${failures.join(', ')}.\n${output}`)
  process.exit(1)
}
console.log('✓  a run without the redirect stops before the first eval')
