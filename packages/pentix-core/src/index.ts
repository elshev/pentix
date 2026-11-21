/** Public API barrel for pentix-core, consumed by the server and the web client. */
export {
  Board,
  createBoard,
  createBoardSnapshot,
  DEFAULT_BOARD_SIZE,
} from './board.js'
export type { BoardCell, BoardSize, BoardSnapshot } from './board.js'
export {
  createPentixGame,
  createTetrisGame,
  ensurePentixGamePieceAtIndex,
} from './game.js'
export type {
  CreatePentixGameOptions,
  PentixGame,
  PieceIdSelector,
} from './game.js'
export {
  advancePentixGameSession,
  createPentixGameSession,
} from './session.js'
export type {
  ActivePieceState,
  AdvancePentixGameSessionResult,
  BoardPosition,
  CreatePentixGameSessionOptions,
  GameSessionActionCounts,
  GameSessionStatistics,
  GameSessionStatus,
  PentixGameSession,
} from './session.js'
export {
  replayPentixGameSession,
  SESSION_ACTION_CODES,
  SESSION_ACTIONS,
} from './session-log.js'
export type {
  PieceActionLog,
  SessionAction,
  SessionActionLog,
} from './session-log.js'
export {
  getPieceDefinition,
  getPieceDefinitionById,
  PIECE_CATALOG,
  PIECES_BY_ID,
  PIECES_BY_KEY,
} from './catalog.js'
export type { PieceKey } from './catalog.js'
export {
  getOccupiedOffsets,
  normalizeAngle,
  Piece,
  rotateOffset,
} from './piece.js'
export type {
  Offset,
  PieceDefinition,
  RotationAngle,
  RotationMode,
} from './piece.js'
export {
  canDemoPieceMoveDown,
  planDemoDestination,
  planDemoDestinationForOrientations,
  planDemoLastTickMove,
} from './demo.js'
export type {
  DemoDestination,
  DemoOrientationDestination,
} from './demo.js'
export {
  DEMO_ACTION_CODES,
  actionsToward,
  createDemoEngineInput,
  demoBoardOf,
  demoCanPlace,
  demoCanPlaceAt,
  demoLandingRow,
  demoOffsetCells,
  demoPieceCells,
  isDemoAction,
  isDemoLastTickMove,
} from './demo-actions.js'
export type {
  DemoAction,
  DemoActionLog,
  DemoBoard,
  DemoEngineInput,
  DemoLastTickMove,
  DemoPiece,
  DemoPieceCell,
  DemoPieceOrientation,
  DemoPosition,
} from './demo-actions.js'
export { adaptAuthoredPlan } from './demo-engine-toolkit.js'
export type { AuthoredPlan } from './demo-engine-toolkit.js'
export { DEFAULT_DEMO_ENGINE_ID, DemoEngineRegistry } from './demo-engine.js'
export type {
  DemoEngine,
  DemoEngineId,
  DemoEngineSummary,
} from './demo-engine.js'
export {
  builtInDemoEngines,
  claudeOpus55ExtraDemoEngine,
  claudeSonnet55ExtraDemoEngine,
  deepseekV4Flash1107MaxDemoEngine,
  deepseekV4ProMaxDemoEngine,
  delphi5DemoEngine,
  demoEngineRegistry,
  getDemoEngine,
  glm53FlashExtraDemoEngine,
  minimaxM31FlashExtraDemoEngine,
  qwen4MaxDemoEngine,
  randomDemoEngine,
} from './demo-engines/index.js'
export {
  GameSessionEngine,
  gameSessionEngine,
} from './session-engine.js'
export type { MoveDirection, RotateDirection } from './session-engine.js'
export { createUser } from './user.js'
export type { CreateUserOptions, User } from './user.js'
