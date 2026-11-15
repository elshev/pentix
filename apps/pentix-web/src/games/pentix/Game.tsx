/** Pentix game screen wiring the board, HUD, controls, settings, and game loop. */
import { useMemo, useReducer } from 'react'

import {
  createGameReducer,
  createInitialState,
  type GameDependencies,
} from '../../engine/gameReducer.ts'
import { BoardView } from './BoardView.tsx'
import { Controls } from './Controls.tsx'
import { Hud } from './Hud.tsx'
import { SecondaryStats } from './SecondaryStats.tsx'
import { Settings } from './Settings.tsx'
import { useDemoController } from './useDemoController.ts'
import { useGameLoop } from './useGameLoop.ts'
import { useGameOverCooldown } from './useGameOverCooldown.ts'
import { useKeyboardControls } from './useKeyboardControls.ts'

interface OverlayProps {
  readonly title: string
  readonly label: string
  readonly onClick: () => void
}

function Overlay({ title, label, onClick }: OverlayProps) {
  return (
    <div className="overlay__card">
      <p className="overlay__title">{title}</p>
      <button type="button" className="overlay__button" onClick={onClick}>
        {label}
      </button>
    </div>
  )
}

function defaultCreateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function Game() {
  const dependencies = useMemo<GameDependencies>(() => ({ createId: defaultCreateId }), [])
  const reducer = useMemo(() => createGameReducer(dependencies), [dependencies])
  const [state, dispatch] = useReducer(reducer, dependencies, (deps) =>
    createInitialState(deps),
  )

  const {
    phase,
    gameOverReady,
    settings,
    gravityEpoch,
    session,
    collectedStats,
  } = state
  const level = session.statistics.level
  const loopActive = phase === 'playing' || phase === 'demo'

  useGameLoop(loopActive, level, gravityEpoch, () =>
    dispatch({ type: 'tick' }),
  )
  useDemoController(phase === 'demo', level, session, dispatch)
  useKeyboardControls(phase, dispatch)
  useGameOverCooldown(phase === 'game-over' && !gameOverReady, dispatch)

  const label =
    phase === 'playing'
      ? 'Playing'
      : phase === 'paused'
        ? 'Paused'
        : phase === 'game-over'
          ? 'Game over'
          : 'Demo'

  return (
    <section className="game">
      <div className="game__stage">
        <BoardView session={session} />
        {phase === 'paused' && (
          <div className="overlay">
            <Overlay
              title="Paused"
              label="Resume"
              onClick={() => dispatch({ type: 'resume' })}
            />
          </div>
        )}
        {phase === 'game-over' && (
          <div className="overlay overlay--soft">
            <div className="overlay__card">
              <p className="overlay__title">Game over</p>
              <div className="overlay__actions">
                <button
                  type="button"
                  className="overlay__button"
                  title="Play again (Enter)"
                  disabled={!gameOverReady}
                  onClick={() => dispatch({ type: 'restart' })}
                >
                  Play again
                </button>
                <button
                  type="button"
                  className="overlay__button overlay__button--secondary"
                  title="Demo (Space)"
                  disabled={!gameOverReady}
                  onClick={() => dispatch({ type: 'demo' })}
                >
                  Demo
                </button>
              </div>
            </div>
          </div>
        )}
        {phase === 'demo' && (
          <p className="demo-badge">Demo — press Space to play</p>
        )}
      </div>
      <Hud
        statistics={session.statistics}
        nextPieceKey={session.nextPieceKey}
        showNextPiece={settings.showNextPiece}
      />
      <div className="game__secondary">
        <SecondaryStats collectedStats={collectedStats} />
      </div>
      <Controls phase={phase} dispatch={dispatch} />
      <Settings settings={settings} dispatch={dispatch} />
      <p className="status-line" aria-live="polite">
        {label}
      </p>
    </section>
  )
}