/** Pentix game screen wiring the board, HUD, controls, settings, and game loop. */
import { useMemo, useReducer, useRef, useState } from 'react'

import {
  createGameReducer,
  createInitialState,
  isDemoCycleOver,
  mainBoardName,
  type GameDependencies,
} from '../../engine/gameReducer.ts'
import { BoardView } from './BoardView.tsx'
import { Controls } from './Controls.tsx'
import { DemoBoard } from './DemoBoard.tsx'
import { Hud } from './Hud.tsx'
import { Settings } from './Settings.tsx'
import { useDemoController } from './useDemoController.ts'
import { useDemoRestart } from './useDemoRestart.ts'
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
    mainEngineId,
    session,
    demoBoards,
  } = state
  const level = session.statistics.level
  const name = mainBoardName(state)
  // A demo board can trade places with the main board only while the attract
  // demo (or its finished board) owns the main board.
  const canSwapBoards = phase === 'demo' || phase === 'demo-over'

  // The pieces statistics popup pauses whatever is running: a player game is put
  // into the paused phase (the paused overlay is suppressed while the popup is
  // open) and the attract demo simply stops advancing. Closing resumes only a
  // game this popup paused.
  const [statsOpen, setStatsOpen] = useState(false)
  const resumeOnClose = useRef(false)

  function toggleStats() {
    if (statsOpen) {
      setStatsOpen(false)
      if (resumeOnClose.current) {
        resumeOnClose.current = false
        dispatch({ type: 'resume' })
      }
      return
    }
    setStatsOpen(true)
    if (phase === 'playing') {
      resumeOnClose.current = true
      dispatch({ type: 'pause' })
    }
  }

  useGameLoop(phase === 'playing', level, gravityEpoch, () =>
    dispatch({ type: 'tick' }),
  )
  useDemoController(
    phase === 'demo' && !statsOpen,
    level,
    session,
    mainEngineId,
    dispatch,
  )
  useKeyboardControls(phase, dispatch)
  useGameOverCooldown(phase === 'game-over' && !gameOverReady, dispatch)
  // The attract cycle restarts only once every board has ended, so a finished
  // main demo waits for the rail instead of starting a new demo beside it.
  useDemoRestart(isDemoCycleOver(state), dispatch)

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
      <div className="game__layout">
        <div className="game__column">
          <Hud
            name={name}
            statistics={session.statistics}
            nextPieceKey={session.nextPieceKey}
            showNextPiece={settings.showNextPiece}
            statsOpen={statsOpen}
            onToggleStats={toggleStats}
          />
          <div className="game__stage">
            <BoardView session={session} />
            {phase === 'paused' && !statsOpen && (
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
            {phase === 'demo-over' && (
              <p className="demo-badge">
                Demo over — press Space for the next demo
              </p>
            )}
          </div>
          <div className="game__bottom">
            <Controls phase={phase} level={level} dispatch={dispatch} />
            <Settings settings={settings} dispatch={dispatch} />
          </div>
          <p className="status-line" aria-live="polite">
            {label}
          </p>
        </div>
        {/* The rail reserves four slots per row for the planned twelve boards. */}
        <aside className="demo-rail" aria-label="Demo boards">
          <div className="demo-rail__grid">
            {demoBoards.map((board) => (
              <DemoBoard
                key={board.id}
                board={board}
                dispatch={dispatch}
                canSwap={canSwapBoards}
              />
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}