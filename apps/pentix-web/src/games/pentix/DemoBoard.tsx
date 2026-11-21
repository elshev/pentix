/** One small demo board: engine name, primary statistics, and its board. */
import type { Dispatch } from 'react'

import { getDemoEngine } from '#pentix/core'

import type { DemoBoardState, GameAction } from '../../engine/gameReducer.ts'
import { BoardView } from './BoardView.tsx'
import { useDemoBoard } from './useDemoBoard.ts'

interface DemoBoardProps {
  readonly board: DemoBoardState
  readonly dispatch: Dispatch<GameAction>
  /** True while the main board runs the attract demo, so a double-click swaps. */
  readonly canSwap: boolean
}

/**
 * A parallel demo board in the rail. It shows only the primary statistics and
 * its engine's name: no next-piece preview, no pieces popup, no level buttons,
 * no controls. A finished board shows the game-over state as a board overlay.
 * During the attract demo a double-click moves it to the main board, sending
 * the main board's session into this slot.
 */
export function DemoBoard({ board, dispatch, canSwap }: DemoBoardProps) {
  useDemoBoard(board, dispatch)

  const engine = getDemoEngine(board.engineId)
  const { statistics, status } = board.session

  return (
    <article
      className={canSwap ? 'demo-board demo-board--swap' : 'demo-board'}
      aria-label={`${engine.name} demo board`}
      title={canSwap ? 'Double-click to move to the main board' : undefined}
      onDoubleClick={() => dispatch({ type: 'swapBoard', boardId: board.id })}
    >
      <header className="demo-board__head">
        <p className="demo-board__engine">{engine.name}</p>
        <span
          className="demo-board__info"
          role="img"
          tabIndex={0}
          aria-label={`About ${engine.name}`}
        >
          i
          <span className="demo-board__about">
            <strong>{engine.name}</strong>
            <span>{engine.description}</span>
          </span>
        </span>
      </header>
      <div className="demo-board__stats">
        <DemoStat short="S" label="Score" value={statistics.score} />
        <DemoStat short="L" label="Lines" value={statistics.clearedLines} />
        <DemoStat short="P" label="Pieces" value={statistics.blocks} />
      </div>
      <div className="demo-board__stage">
        <BoardView session={board.session} compact />
        {status === 'game-over' && (
          <div className="overlay overlay--mini">
            <div className="overlay__card overlay__card--mini">
              <p className="overlay__title">Game over</p>
              <dl className="overlay__final">
                <div>
                  <dt>Score</dt>
                  <dd>{statistics.score}</dd>
                </div>
                <div>
                  <dt>Lines</dt>
                  <dd>{statistics.clearedLines}</dd>
                </div>
                <div>
                  <dt>Pieces</dt>
                  <dd>{statistics.blocks}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

function DemoStat({
  short,
  label,
  value,
}: {
  short: string
  label: string
  value: number
}) {
  return (
    <span className="demo-board__stat">
      <span className="demo-board__label" title={label} aria-label={label}>
        {short}
      </span>
      <strong className="demo-board__value">{value}</strong>
    </span>
  )
}
