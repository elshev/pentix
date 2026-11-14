import { useEffect, useRef } from 'react'

import { getTickInterval, MAX_FRAME_MS } from '../../engine/gameLoop.ts'

export function useGameLoop(
  active: boolean,
  level: number,
  epoch: number,
  onTick: () => void,
): void {
  const onTickRef = useRef(onTick)
  const accumulatorRef = useRef(0)
  const previousRef = useRef(0)
  const armedEpochRef = useRef(epoch)

  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  // Restart the gravity clock when the epoch changes (e.g. after a hard drop)
  // so a full tick elapses before a resting piece locks.
  useEffect(() => {
    if (armedEpochRef.current === epoch) {
      return
    }
    armedEpochRef.current = epoch
    accumulatorRef.current = 0
    previousRef.current = performance.now()
  }, [epoch])

  useEffect(() => {
    if (!active) {
      return
    }

    const interval = getTickInterval(level)
    let frame = 0
    previousRef.current = performance.now()
    accumulatorRef.current = 0

    const step = (now: number) => {
      const delta = Math.min(now - previousRef.current, MAX_FRAME_MS)
      previousRef.current = now
      accumulatorRef.current += delta

      while (accumulatorRef.current >= interval) {
        accumulatorRef.current -= interval
        onTickRef.current()
      }

      frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [active, level])
}