import type { PieceKey } from './catalog.js'

export interface BoardCell {
  readonly row: number
  readonly column: number
  readonly isOccupied: boolean
  readonly pieceKey?: PieceKey
}

export interface BoardSize {
  readonly width: number
  readonly height: number
}

export interface BoardSnapshot {
  readonly width: number
  readonly height: number
  readonly rows: readonly (readonly BoardCell[])[]
}

function createBoardCell(
  row: number,
  column: number,
  isOccupied = false,
  pieceKey?: PieceKey,
): BoardCell {
  return Object.freeze({
    row,
    column,
    isOccupied,
    pieceKey: isOccupied ? pieceKey : undefined,
  })
}

export const DEFAULT_BOARD_SIZE = Object.freeze({
  width: 12,
  height: 22,
}) satisfies BoardSize

export class Board {
  readonly width: number
  readonly height: number
  private readonly cells: BoardCell[][]

  constructor(width: number, height: number) {
    if (!Number.isInteger(width) || width <= 0) {
      throw new Error('Board width must be a positive integer.')
    }

    if (!Number.isInteger(height) || height <= 0) {
      throw new Error('Board height must be a positive integer.')
    }

    this.width = width
    this.height = height
    this.cells = Array.from({ length: height }, (_, row) =>
      Array.from({ length: width }, (_, column) =>
        createBoardCell(row, column),
      ),
    )
  }

  isInBounds(row: number, column: number): boolean {
    return (
      row >= 0 &&
      row < this.height &&
      column >= 0 &&
      column < this.width
    )
  }

  getCell(row: number, column: number): BoardCell {
    this.assertInBounds(row, column)
    return this.cells[row][column]
  }

  setCell(row: number, column: number, pieceKey?: PieceKey): BoardCell {
    this.assertInBounds(row, column)
    const nextCell = createBoardCell(row, column, pieceKey !== undefined, pieceKey)
    this.cells[row][column] = nextCell
    return nextCell
  }

  clearCell(row: number, column: number): BoardCell {
    this.assertInBounds(row, column)
    const nextCell = createBoardCell(row, column)
    this.cells[row][column] = nextCell
    return nextCell
  }

  toRows(): readonly (readonly BoardCell[])[] {
    return Object.freeze(
      this.cells.map((row) => Object.freeze(row.slice())),
    )
  }

  private assertInBounds(row: number, column: number): void {
    if (!this.isInBounds(row, column)) {
      throw new RangeError(
        `Board cell (${row}, ${column}) is outside ${this.width}x${this.height}.`,
      )
    }
  }
}

export function createBoardSnapshot(board: Board): BoardSnapshot {
  return Object.freeze({
    width: board.width,
    height: board.height,
    rows: board.toRows(),
  })
}

export function createBoard(size: BoardSize = DEFAULT_BOARD_SIZE): Board {
  return new Board(size.width, size.height)
}
