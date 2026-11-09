import type { WatchSource } from 'vue'


/** Timers for a scripted scene, cleared together on `clear()` and when the component unmounts. */
export function useSceneTimers() {
  let timers: ReturnType<typeof setTimeout>[] = []

  function later(ms: number, run: () => void) {
    timers.push(setTimeout(run, ms))
  }

  function clear() {
    timers.forEach(clearTimeout)
    timers = []
  }

  onBeforeUnmount(clear)

  return { later, clear }
}

/**
 * Scrolls a scene's thread to its latest message when `source` changes, like a chat app does.
 * Opening a disclosure inside the thread doesn't move it. Marks the thread with `data-scrolled`
 * and `data-more` so its edges fade where content continues.
 */
export function useScrollToEnd(container: Ref<HTMLElement | null>, source: WatchSource) {
  let observer: ResizeObserver | undefined

  onMounted(() => {
    const element = container.value!
    const edges = () => {
      element.toggleAttribute('data-scrolled', element.scrollTop > 0)
      element.toggleAttribute('data-more', element.scrollTop + element.clientHeight < element.scrollHeight - 1)
    }
    element.addEventListener('scroll', edges, { passive: true })
    observer = new ResizeObserver(edges)
    observer.observe(element.firstElementChild!)
  })

  onBeforeUnmount(() => observer?.disconnect())

  watch(source, () => {
    const element = container.value
    element?.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
  }, { deep: true, flush: 'post' })
}

/** Scrolls the scene thread around `element` just enough to show all of it, after it expands. */
export function revealInScene(element: HTMLElement) {
  const scroller = element.closest('.scene-scroll')!
  const overflow = element.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom + 12
  if (overflow > 0) scroller.scrollBy({ top: overflow, behavior: 'smooth' })
}
