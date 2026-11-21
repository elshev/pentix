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
import * as claudeOpus55Extra from './claude-opus-5-5-extra-demo-engine.js'
import * as claudeSonnet55Extra from './claude-sonnet-5-5-extra-demo-engine.js'
import * as deepseekV4Flash1107Max from './deepseek-v4-flash-1107-max-demo-engine.js'
import * as deepseekV4ProMax from './deepseek-v4-pro-max-demo-engine.js'
import * as delphi5 from './delphi5-demo-engine.js'
import * as glm53FlashExtra from './glm-5-3-flash-extra-demo-engine.js'
import * as minimaxM31FlashExtra from './minimax-m3-1-flash-extra-demo-engine.js'
import * as qwen4Max from './qwen-4-max-demo-engine.js'
import * as random from './random-demo-engine.js'

export const delphi5DemoEngine: DemoEngine = delphi5
export const randomDemoEngine: DemoEngine = random
export const claudeOpus55ExtraDemoEngine: DemoEngine = claudeOpus55Extra
export const claudeSonnet55ExtraDemoEngine: DemoEngine = claudeSonnet55Extra
export const deepseekV4Flash1107MaxDemoEngine: DemoEngine = deepseekV4Flash1107Max
export const deepseekV4ProMaxDemoEngine: DemoEngine = deepseekV4ProMax
export const glm53FlashExtraDemoEngine: DemoEngine = glm53FlashExtra
export const minimaxM31FlashExtraDemoEngine: DemoEngine = minimaxM31FlashExtra
export const qwen4MaxDemoEngine: DemoEngine = qwen4Max

/** Every built-in engine, in registration order. */
export const builtInDemoEngines: readonly DemoEngine[] = Object.freeze([
  delphi5DemoEngine,
  randomDemoEngine,
  claudeOpus55ExtraDemoEngine,
  claudeSonnet55ExtraDemoEngine,
  deepseekV4Flash1107MaxDemoEngine,
  deepseekV4ProMaxDemoEngine,
  glm53FlashExtraDemoEngine,
  minimaxM31FlashExtraDemoEngine,
  qwen4MaxDemoEngine,
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
