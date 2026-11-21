/**
 * Stable helper surface for demo-engine modules and the wrappers that adapt an
 * authored plan function into an engine.
 *
 * Everything here is pure: geometry on the minimal planning inputs plus the
 * classic destination heuristic.
 */
import {
  DEMO_ACTION_CODES,
  isDemoAction,
  isDemoLastTickMove,
} from './demo-actions.js'
import type { DemoActionLog } from './demo-actions.js'
import type { DemoEngine } from './demo-engine.js'

export {
  DEMO_ACTION_CODES,
  actionsToward,
  createDemoEngineInput,
  demoCanPlace,
  demoCanPlaceAt,
  demoLandingRow,
  demoPieceCells,
  isDemoAction,
  isDemoLastTickMove,
} from './demo-actions.js'
export type {
  DemoAction,
  DemoActionLog,
  DemoBoard,
  DemoEngineInput,
  DemoLastTickMove,
  DemoPiece,
  DemoPieceCell,
  DemoPieceOrientation,
  DemoPosition,
} from './demo-actions.js'
export { planDemoDestinationForOrientations } from './demo.js'
export type {
  DemoDestination,
  DemoOrientationDestination,
} from './demo.js'
export type { BoardSnapshot } from './board.js'

/**
 * A plan function authored from the standalone demo-engine brief.
 *
 * The brief promises mutable inputs, while the contract hands engines readonly
 * ones. `adaptAuthoredPlan` bridges the two.
 */
export type AuthoredPlan = (
  board: number[][],
  piece: { row: number; column: number }[][],
  position: { row: number; column: number },
) => string

/**
 * Trims an authored result to a legal `DemoActionLog`: only the demo action
 * codes survive, and at most one `L`/`R` may follow the first `H`.
 */
function toDemoActionLog(value: unknown): DemoActionLog {
  if (typeof value !== 'string') {
    return ''
  }

  let log = ''
  for (const code of value) {
    if (!isDemoAction(code)) {
      continue
    }
    if (log.includes(DEMO_ACTION_CODES.hardDrop)) {
      if (!isDemoLastTickMove(code)) {
        continue
      }
      log += code
      break
    }
    log += code
  }
  return log
}

/**
 * Wraps an authored plan function in the demo-engine contract.
 *
 * Each call hands the authored body fresh mutable copies of the readonly
 * inputs, returns the empty log when the body throws, and normalizes the
 * result to a legal action log.
 */
export function adaptAuthoredPlan(plan: AuthoredPlan): DemoEngine['plan'] {
  return (board, piece, position) => {
    const mutableBoard: number[][] = board.map((row) => [...row])
    const mutablePiece = piece.map((orientation) =>
      orientation.map((cell) => ({ row: cell.row, column: cell.column })),
    )
    const mutablePosition = { row: position.row, column: position.column }

    try {
      return toDemoActionLog(
        plan(mutableBoard, mutablePiece, mutablePosition),
      )
    } catch {
      return ''
    }
  }
}
