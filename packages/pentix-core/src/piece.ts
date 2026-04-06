export interface Offset {
  readonly x: number
  readonly y: number
}

export type RotationAngle = 0 | 90 | 180 | 270
export type RotationMode = 'none' | 'half' | 'full'

export interface PieceDefinition {
  readonly id: number
  readonly key: string
  readonly name: string
  readonly colorName: string
  readonly rotationMode: RotationMode
  readonly offsets: readonly Offset[]
}

function normalizeCoordinate(value: number): number {
  return Object.is(value, -0) ? 0 : value
}

function normalizeRightAngle(angle: number): RotationAngle {
  if (!Number.isFinite(angle)) {
    return 0
  }

  const integerAngle = Math.trunc(angle)
  if (integerAngle % 90 !== 0) {
    return 0
  }

  let normalizedAngle = integerAngle % 360
  if (normalizedAngle < 0) {
    normalizedAngle += 360
  }

  return normalizedAngle as RotationAngle
}

export function normalizeAngle(
  angle: number,
  rotationMode: RotationMode,
): RotationAngle {
  const normalizedAngle = normalizeRightAngle(angle)

  if (rotationMode === 'none') {
    return 0
  }

  if (rotationMode === 'half') {
    return (normalizedAngle % 180) as RotationAngle
  }

  return normalizedAngle
}

export function rotateOffset(offset: Offset, angle: number): Offset {
  const normalizedAngle = normalizeRightAngle(angle)

  switch (normalizedAngle) {
    case 90:
      return {
        x: normalizeCoordinate(offset.y),
        y: normalizeCoordinate(-offset.x),
      }
    case 180:
      return {
        x: normalizeCoordinate(-offset.x),
        y: normalizeCoordinate(-offset.y),
      }
    case 270:
      return {
        x: normalizeCoordinate(-offset.y),
        y: normalizeCoordinate(offset.x),
      }
    default:
      return {
        x: normalizeCoordinate(offset.x),
        y: normalizeCoordinate(offset.y),
      }
  }
}

export function getOccupiedOffsets(
  offsets: readonly Offset[],
  angle: number,
  rotationMode: RotationMode,
): Offset[] {
  const normalizedAngle = normalizeAngle(angle, rotationMode)
  return offsets.map((offset) => rotateOffset(offset, normalizedAngle))
}

export class Piece {
  readonly definition: PieceDefinition
  readonly angle: RotationAngle

  constructor(definition: PieceDefinition, angle = 0) {
    this.definition = definition
    this.angle = normalizeAngle(angle, definition.rotationMode)
  }

  get id(): number {
    return this.definition.id
  }

  get key(): string {
    return this.definition.key
  }

  get name(): string {
    return this.definition.name
  }

  get colorName(): string {
    return this.definition.colorName
  }

  get rotationMode(): RotationMode {
    return this.definition.rotationMode
  }

  get offsets(): readonly Offset[] {
    return this.definition.offsets
  }

  get minoCount(): number {
    return this.definition.offsets.length
  }

  get points(): number {
    return this.minoCount
  }

  get occupiedOffsets(): Offset[] {
    return getOccupiedOffsets(
      this.definition.offsets,
      this.angle,
      this.definition.rotationMode,
    )
  }

  withAngle(angle: number): Piece {
    return new Piece(this.definition, angle)
  }
}
