/** Statistics row above the board, with the pieces counter as a drop-down toggle. */
import type { GameSessionStatistics, PieceKey } from '#pentix/core'

import { NextPiecePreview } from './NextPiecePreview.tsx'
import { SecondaryStats } from './SecondaryStats.tsx'

interface HudProps {
  readonly statistics: GameSessionStatistics
  readonly nextPieceKey: PieceKey
  readonly showNextPiece: boolean
  readonly statsOpen: boolean
  readonly onToggleStats: () => void
}

export function Hud({
  statistics,
  nextPieceKey,
  showNextPiece,
  statsOpen,
  onToggleStats,
}: HudProps) {
  return (
    <aside className="hud" aria-label="Statistics">
      <div className="hud__stats">
        {showNextPiece && (
          <div className="hud__stat hud__stat--next">
            <p className="hud__label">Next</p>
            <NextPiecePreview pieceKey={nextPieceKey} />
          </div>
        )}
        <div className="hud__stat">
          <p className="hud__label">Score</p>
          <strong className="hud__value">{statistics.score}</strong>
        </div>
        <div className="hud__stat">
          <p className="hud__label">Lines</p>
          <strong className="hud__value">{statistics.clearedLines}</strong>
        </div>
        <button
          type="button"
          className="hud__stat hud__toggle"
          aria-expanded={statsOpen}
          aria-controls="pieces-stats"
          title="Pieces statistics"
          onClick={onToggleStats}
        >
          <span className="hud__label">Pieces</span>
          <strong className="hud__value">
            {statistics.blocks}
            <span className="hud__chevron" aria-hidden="true">
              {statsOpen ? '▾' : '▸'}
            </span>
          </strong>
        </button>
      </div>
      {statsOpen && (
        <div
          id="pieces-stats"
          className="stats-popup"
          role="dialog"
          aria-label="Pieces statistics"
        >
          <SecondaryStats statistics={statistics} />
        </div>
      )}
    </aside>
  )
}
