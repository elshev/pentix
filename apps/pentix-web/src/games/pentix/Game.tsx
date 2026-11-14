import { useMemo, useReducer } from 'react'

import {
  createGameReducer,
  createInitialState,
  type GameDependencies,
} from '../../engine/gameReducer.ts'
import { BoardView } from './BoardView.tsx'
import { Controls } from './Controls.tsx'
import { Hud } from './Hud.tsx'
import { Settings } from './Settings.tsx'
import { useGameLoop } from './useGameLoop.ts'
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
    createInitialState(deps, 'ready'),
  )

  const { phase, settings, gravityEpoch, session } = state

  useGameLoop(phase === 'playing', session.statistics.level, gravityEpoch, () =>
    dispatch({ type: 'tick' }),
  )
  useKeyboardControls(phase, dispatch)

  const label =
    phase === 'playing'
      ? 'Playing'
      : phase === 'paused'
        ? 'Paused'
        : phase === 'game-over'
          ? 'Game over'
          : 'Ready'

  return (
    <section className="game">
      <div className="game__stage">
        <BoardView session={session} />
        {phase !== 'playing' && (
          <div className="overlay">
            {phase === 'paused' && (
              <Overlay
                title="Paused"
                label="Resume"
                onClick={() => dispatch({ type: 'resume' })}
              />
            )}
            {phase === 'game-over' && (
              <Overlay
                title="Game over"
                label="Play again"
                onClick={() => dispatch({ type: 'restart' })}
              />
            )}
            {phase === 'ready' && (
              <Overlay
                title="Ready"
                label="Start game"
                onClick={() => dispatch({ type: 'start' })}
              />
            )}
          </div>
        )}
      </div>
      <Hud
        statistics={session.statistics}
        nextPieceKey={session.nextPieceKey}
        showNextPiece={settings.showNextPiece}
      />
      <Controls phase={phase} dispatch={dispatch} />
      <Settings settings={settings} dispatch={dispatch} />
      <p className="status-line" aria-live="polite">
        {label}
      </p>
    </section>
  )
}