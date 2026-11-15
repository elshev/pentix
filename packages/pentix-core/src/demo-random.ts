/**
 * TEMPORARY demo engine: plans a random reachable destination.
 *
 * This engine exists only to exercise the demo-engine registry seam and is
 * intended to be removed. It deliberately implements no heuristic beyond
 * picking a reachable rotation angle and column at random.
 */
import { candidateAngles, findLandingRow } from './demo.js'
import type { DemoDestination } from './demo.js'
import type { DemoEngine } from './demo-engine.js'
import { getActivePiece } from './placement.js'
import type { PentixGameSession } from './session.js'

/** Collects every angle and column the active piece can be dropped in. */
function reachableDestinations(session: PentixGameSession): DemoDestination[] {
  const { board } = session
  const piece = getActivePiece(session)
  const destinations: DemoDestination[] = []

  for (const angle of candidateAngles(piece.rotationMode)) {
    const rotated = piece.withAngle(angle)
    for (let column = 0; column < board.width; column += 1) {
      if (findLandingRow(board, rotated, column) !== null) {
        destinations.push({ angle, column })
      }
    }
  }

  return destinations
}

/**
 * TEMPORARY: picks a uniformly random reachable destination and never takes a
 * last-tick side-step. Remove this engine, its registry entry, and its barrel
 * export once a real alternative engine exists.
 */
export const randomDemoEngine: DemoEngine = Object.freeze({
  id: 'random',
  name: 'Random',
  planDestination(session: PentixGameSession): DemoDestination | null {
    const destinations = reachableDestinations(session)
    if (destinations.length === 0) {
      return null
    }
    return destinations[Math.floor(Math.random() * destinations.length)]
  },
  planLastTickMove(): DemoDestination | null {
    return null
  },
})
