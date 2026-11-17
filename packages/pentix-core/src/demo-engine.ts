/**
 * The pluggable demo-engine contract and the registry that owns engine lookup.
 *
 * An engine is one module with four exports (`id`, `name`, `description`, and
 * `plan`) and is a pure planner: it returns the active piece's action log and
 * never mutates the session or advances gravity. The log must never contain
 * `T`: the demo driver applies Action then Tick.
 */
import type {
  DemoActionLog,
  DemoBoard,
  DemoPiece,
  DemoPosition,
} from './demo-actions.js'

export type DemoEngineId = string

/**
 * A demo (attract-mode) planning strategy, exactly as an engine module exports
 * it.
 *
 * The engine receives only what it needs to plan one piece: the visible board,
 * the active piece's cells relative to its rotation point, and that rotation
 * point. The action log it returns must never contain `T`.
 */
export interface DemoEngine {
  readonly id: DemoEngineId
  readonly name: string
  readonly description: string
  plan(
    board: DemoBoard,
    piece: DemoPiece,
    position: DemoPosition,
  ): DemoActionLog
}

/** The metadata the UI may render without planning. */
export interface DemoEngineSummary {
  readonly id: DemoEngineId
  readonly name: string
  readonly description: string
}

/** The engine the demo uses when no other engine is selected. */
export const DEFAULT_DEMO_ENGINE_ID: DemoEngineId = 'delphi5'

const DEMO_ENGINE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Rejects an engine that does not match the module shape the catalog expects. */
function assertDemoEngine(engine: DemoEngine): void {
  if (
    typeof engine.id !== 'string' ||
    !DEMO_ENGINE_ID_PATTERN.test(engine.id)
  ) {
    throw new Error(
      `Demo engine id '${String(engine.id)}' must be lowercase kebab-case.`,
    )
  }

  if (typeof engine.name !== 'string' || engine.name.trim().length === 0) {
    throw new Error(`Demo engine '${engine.id}' must have a non-empty name.`)
  }

  if (
    typeof engine.description !== 'string' ||
    engine.description.trim().length === 0
  ) {
    throw new Error(
      `Demo engine '${engine.id}' must have a non-empty description.`,
    )
  }

  if (typeof engine.plan !== 'function') {
    throw new Error(`Demo engine '${engine.id}' must provide a plan function.`)
  }
}

/** Maps demo-engine ids to the engines registered under them. */
export class DemoEngineRegistry {
  private readonly engines = new Map<DemoEngineId, DemoEngine>()

  /** Registers an engine, rejecting an id that is already taken. */
  register(engine: DemoEngine): void {
    assertDemoEngine(engine)
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

  /** Returns the engines' metadata in registration order, without planners. */
  summaries(): readonly DemoEngineSummary[] {
    return Object.freeze(
      [...this.engines.values()].map((engine) =>
        Object.freeze({
          id: engine.id,
          name: engine.name,
          description: engine.description,
        }),
      ),
    )
  }
}
