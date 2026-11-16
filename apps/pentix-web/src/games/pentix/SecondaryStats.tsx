/** Pieces statistics popup body: engine-recorded action counts and per-piece totals. */
import { PIECE_CATALOG, type GameSessionStatistics } from '#pentix/core'

import { PieceMini } from './PieceMini.tsx'

interface SecondaryStatsProps {
  readonly statistics: GameSessionStatistics
}

export function SecondaryStats({ statistics }: SecondaryStatsProps) {
  // The engine sums left and right moves into one action count.
  const { actions, pieceCounts } = statistics

  return (
    <div className="secondary-stats">
      <div className="secondary-stats__row">
        <span className="secondary-stats__item">Moves {actions.moves}</span>
        <span className="secondary-stats__item">Rotates {actions.rotates}</span>
        <span className="secondary-stats__item">Drops {actions.drops}</span>
      </div>
      <div className="piece-counts">
        {PIECE_CATALOG.map((piece) => (
          <div key={piece.key} className="piece-count" title={piece.key}>
            <PieceMini pieceKey={piece.key} />
            <span className="piece-count__value">
              {pieceCounts[piece.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}