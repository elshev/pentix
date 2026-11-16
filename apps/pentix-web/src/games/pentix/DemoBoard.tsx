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
 * no controls, and no overlays. During the attract demo a double-click moves it
 * to the main board, sending the main board's session into this slot.
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
        {status === 'game-over' && (
          <p className="demo-board__status">Game over</p>
        )}
      </header>
      <div className="demo-board__stats">
        <DemoStat label="Score" value={statistics.score} />
        <DemoStat label="Lines" value={statistics.clearedLines} />
        <DemoStat label="Pieces" value={statistics.blocks} />
      </div>
      <BoardView session={board.session} compact />
    </article>
  )
}

function DemoStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="demo-board__stat">
      <span className="demo-board__label">{label}</span>
      <strong className="demo-board__value">{value}</strong>
    </span>
  )
}
