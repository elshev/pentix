/** The pluggable demo-engine contract and the registry that owns engine lookup. */
import type { DemoDestination } from './demo.js'
import { delphi5DemoEngine } from './demo-delphi5.js'
import { randomDemoEngine } from './demo-random.js'
import type { PentixGameSession } from './session.js'

export type DemoEngineId = string

/**
 * A demo (attract-mode) planning strategy. Engines are pure planners: they read
 * a session and return a destination, and never mutate the session, advance
 * gravity, or lock pieces themselves.
 */
export interface DemoEngine {
  readonly id: DemoEngineId
  readonly name: string
  /** Chooses where to steer the active piece, or `null` when no placement exists. */
  planDestination(session: PentixGameSession): DemoDestination | null
  /** Chooses a last-tick side-step, or `null` to let the piece lock. */
  planLastTickMove(session: PentixGameSession): DemoDestination | null
}

/** The engine the demo uses when no other engine is selected. */
export const DEFAULT_DEMO_ENGINE_ID: DemoEngineId = 'delphi5'

/** Maps demo-engine ids to the engines registered under them. */
export class DemoEngineRegistry {
  private readonly engines = new Map<DemoEngineId, DemoEngine>()

  /** Registers an engine, rejecting an id that is already taken. */
  register(engine: DemoEngine): void {
    if (this.engines.has(engine.id)) {
      throw new Error(`Demo engine '${engine.id}' is already registered.`)
    }
    this.engines.set(engine.id, engine)
  }

  /** Returns the engine registered under `id`, rejecting an unknown id. */
  get(id: DemoEngineId): DemoEngine {
    const engine = this.engines.get(id)
    if (engine === undefined) {
      throw new Error(`Unknown demo engine '${id}'.`)
    }
    return engine
  }

  /** Returns every registered engine in registration order. */
  list(): readonly DemoEngine[] {
    return Object.freeze([...this.engines.values()])
  }
}

/** The application registry containing the built-in demo engines. */
export const demoEngineRegistry = new DemoEngineRegistry()
demoEngineRegistry.register(delphi5DemoEngine)
demoEngineRegistry.register(randomDemoEngine)

/** Returns a registered demo engine, defaulting to the classic heuristic. */
export function getDemoEngine(
  id: DemoEngineId = DEFAULT_DEMO_ENGINE_ID,
): DemoEngine {
  return demoEngineRegistry.get(id)
}
