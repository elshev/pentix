/** Sidebar showing score, level, lines, and the optional next-piece preview. */
import type { GameSessionStatistics, PieceKey } from '#pentix/core'

import { NextPiecePreview } from './NextPiecePreview.tsx'

interface HudProps {
  readonly statistics: GameSessionStatistics
  readonly nextPieceKey: PieceKey
  readonly showNextPiece: boolean
}

export function Hud({ statistics, nextPieceKey, showNextPiece }: HudProps) {
  return (
    <aside className="hud" aria-label="Game statistics">
      <div className="hud__group">
        <p className="hud__label">Score</p>
        <strong className="hud__value">{statistics.score}</strong>
      </div>
      <div className="hud__group">
        <p className="hud__label">Level</p>
        <strong className="hud__value">{statistics.level}</strong>
      </div>
      <div className="hud__group">
        <p className="hud__label">Lines</p>
        <strong className="hud__value">{statistics.clearedLines}</strong>
      </div>
      {showNextPiece && (
        <div className="hud__group">
          <p className="hud__label">Next</p>
          <NextPiecePreview pieceKey={nextPieceKey} />
        </div>
      )}
    </aside>
  )
}