/** The classic Delphi 5 demo planner exposed as a demo engine. */
import { planDemoDestination, planDemoLastTickMove } from './demo.js'
import type { DemoEngine } from './demo-engine.js'

/**
 * The engine whose behaviour was ported from the original Delphi 5 client's
 * `CalcDemoDest` heuristic. It delegates straight to the shared planners, so it
 * reproduces the classic demo exactly.
 */
export const delphi5DemoEngine: DemoEngine = Object.freeze({
  id: 'delphi5',
  name: 'Delphi 5',
  planDestination: planDemoDestination,
  planLastTickMove: planDemoLastTickMove,
})
