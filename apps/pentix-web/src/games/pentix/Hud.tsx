/** Main statistics panel: one row with the next piece (leftmost) and the counters. */
import type { GameSessionStatistics, PieceKey } from '#pentix/core'

import { NextPiecePreview } from './NextPiecePreview.tsx'

interface HudProps {
  readonly statistics: GameSessionStatistics
  readonly nextPieceKey: PieceKey
  readonly showNextPiece: boolean
}

export function Hud({ statistics, nextPieceKey, showNextPiece }: HudProps) {
  return (
    <aside className="hud" aria-label="Main statistics">
      <p className="hud__title">MainStatistics</p>
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
          <p className="hud__label">Level</p>
          <strong className="hud__value">{statistics.level}</strong>
        </div>
        <div className="hud__stat">
          <p className="hud__label">Lines</p>
          <strong className="hud__value">{statistics.clearedLines}</strong>
        </div>
        <div className="hud__stat">
          <p className="hud__label">Pieces</p>
          <strong className="hud__value">{statistics.blocks}</strong>
        </div>
      </div>
    </aside>
  )
}