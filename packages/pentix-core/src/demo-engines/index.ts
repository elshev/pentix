/**
 * The built-in demo-engine catalog: one module per engine, in rail order.
 *
 * Every engine module in this folder is named `<engine-id>-demo-engine.ts` and
 * exports `id`, `name`, `description`, and `plan`. Adding an engine is a new
 * module under this folder plus one entry in `builtInDemoEngines`. No registry
 * or browser-client code changes.
 */
import {
  DEFAULT_DEMO_ENGINE_ID,
  DemoEngineRegistry,
} from '../demo-engine.js'
import type { DemoEngine, DemoEngineId } from '../demo-engine.js'
import * as delphi5 from './delphi5-demo-engine.js'
import * as random from './random-demo-engine.js'

export const delphi5DemoEngine: DemoEngine = delphi5
export const randomDemoEngine: DemoEngine = random

/** Every built-in engine, in registration order. */
export const builtInDemoEngines: readonly DemoEngine[] = Object.freeze([
  delphi5DemoEngine,
  randomDemoEngine,
])

/** The application registry containing the built-in demo engines. */
export const demoEngineRegistry = new DemoEngineRegistry()
for (const engine of builtInDemoEngines) {
  demoEngineRegistry.register(engine)
}

/** Returns a registered demo engine, defaulting to the classic heuristic. */
export function getDemoEngine(
  id: DemoEngineId = DEFAULT_DEMO_ENGINE_ID,
): DemoEngine {
  return demoEngineRegistry.get(id)
}
