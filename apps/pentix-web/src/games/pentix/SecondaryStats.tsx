/** Game-over secondary statistics: key/rotate/drop counts and per-piece totals. */
import { PIECE_CATALOG } from '#pentix/core'

import type { CollectedStats } from '../../engine/gameReducer.ts'
import { CollapsiblePanel } from './CollapsiblePanel.tsx'
import { PieceMini } from './PieceMini.tsx'

interface SecondaryStatsProps {
  readonly collectedStats: CollectedStats
}

export function SecondaryStats({ collectedStats }: SecondaryStatsProps) {
  // Left and right are combined into a single key-press count.
  const keyCount = collectedStats.moveLeft + collectedStats.moveRight

  return (
    <CollapsiblePanel title="Statistics" defaultOpen small>
      <div className="secondary-stats__row">
        <span className="secondary-stats__item">Keys {keyCount}</span>
        <span className="secondary-stats__item">Rotates {collectedStats.rotate}</span>
        <span className="secondary-stats__item">Drops {collectedStats.drop}</span>
      </div>
      <div className="piece-counts">
        {PIECE_CATALOG.map((piece) => (
          <div key={piece.key} className="piece-count" title={piece.key}>
            <PieceMini pieceKey={piece.key} />
            <span className="piece-count__value">
              {collectedStats.pieceCounts[piece.key]}
            </span>
          </div>
        ))}
      </div>
    </CollapsiblePanel>
  )
}