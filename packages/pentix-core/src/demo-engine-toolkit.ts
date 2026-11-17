/**
 * Stable helper surface for demo-engine modules and the wrappers that adapt an
 * authored plan function into an engine.
 *
 * Everything here is pure: geometry on the minimal planning inputs plus the
 * classic destination heuristic.
 */
export {
  DEMO_ACTION_CODES,
  actionsToward,
  createDemoEngineInput,
  demoCanPlace,
  demoLandingRow,
  demoPieceCells,
  isDemoAction,
} from './demo-actions.js'
export type {
  DemoAction,
  DemoActionLog,
  DemoBoard,
  DemoEngineInput,
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
