/**
 * Shared timing for autoplaying figures, so every figure reads at the same calm pace.
 * A step that adds text waits long enough for the reader to read it before the next one.
 */
export const FIGURE_PACE = {
  /** First step after the figure comes into view. */
  start: 500,
  /** Minimum time between two steps. */
  beat: 900,
  /** Reading time added per word of the text a step reveals. */
  perWord: 220,
  /** Typing speed for text typed out character by character. */
  perChar: 38,
  /** Pause on a state the reader must notice, such as an approval waiting. */
  hold: 1800
} as const

/** How long a step that reveals `text` should stay before the next step. */
export function readFor(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(FIGURE_PACE.beat, 600 + words * FIGURE_PACE.perWord)
}

/** Lays out `durations` back to back from `FIGURE_PACE.start`, returning each step's start time. */
export function timeline(durations: readonly number[]) {
  let at = FIGURE_PACE.start
  return durations.map((duration) => {
    const start = at
    at += duration
    return start
  })
}
