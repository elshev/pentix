import { PIECE_CATALOG, type PieceKey } from '#pentix/core'

const FALLBACK_COLOR = '#8891a5'

const COLOR_BY_NAME: Record<string, string> = {
  blue: '#4f83ff',
  red: '#ff5d5d',
  silver: '#c7d3e6',
  yellow: '#f7c75f',
  fuchsia: '#e05dff',
  lime: '#7be05d',
  aqua: '#4fe0d0',
}

const COLOR_BY_KEY: Record<PieceKey, string> = {} as Record<PieceKey, string>

for (const piece of PIECE_CATALOG) {
  COLOR_BY_KEY[piece.key] = COLOR_BY_NAME[piece.colorName] ?? FALLBACK_COLOR
}

export function getPieceColor(pieceKey: PieceKey): string {
  return COLOR_BY_KEY[pieceKey] ?? FALLBACK_COLOR
}