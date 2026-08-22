/**
 * @file index.ts
 * @description Public API boundary for @gearcube/core.
 */

// Canonical Collections & Types (from values.ts)
export {
  FACES,
  DIRECTIONS,
  CORNER_CONFIGURATIONS,
  SLICE_PERMUTATION_CLASSES,
  SLICE_GEAR_PHASES,
} from './values.js';

export type {
  Face,
  Direction,
  Move,
  CornerConfiguration,
  SlicePermutationClass,
  SliceGearPhase,
  EdgeSliceCoordinate,
  GearCubeState,
} from './values.js';

// Public Constants & Counts (from constants.ts)
export {
  ALL_MOVES,
  CORNER_CONFIGURATION_COUNT,
  EDGE_SLICE_STATE_COUNT,
  CANONICAL_DOMAIN_SIZE,
  SOLVED_GEAR_CUBE_STATE,
} from './constants.js';

// Validation Type Guards (from validation.ts)
export {
  isFace,
  isDirection,
  isMove,
  isCornerConfiguration,
  isSlicePermutationClass,
  isSliceGearPhase,
  isEdgeSliceCoordinate,
  isGearCubeState,
} from './validation.js';

// State Operations (from state.ts)
export { equalsGearCubeState, isSolved } from './state.js';

// Canonical Transition Operations (from transitions.ts)
export { applyMove } from './transitions.js';

// SpatialFrame Lifecycle & Operations (from spatial-frame.ts)
export {
  SPATIAL_FRAMES,
  DEFAULT_SPATIAL_FRAME,
  isSpatialFrame,
  nextSpatialFrame,
} from './spatial-frame.js';

export type { SpatialFrame } from './spatial-frame.js';

// Piece Placement Materialization & Vocabularies (from materializer.ts)
export {
  CORNER_SLOTS,
  EDGE_SLOTS,
  CENTER_SLOTS,
  CORNER_PIECE_IDS,
  EDGE_PIECE_IDS,
  CENTER_PIECE_IDS,
  materializeState,
} from './materializer.js';

export type {
  CornerSlot,
  CornerPieceId,
  CornerPlacement,
  EdgeSlot,
  EdgePieceId,
  EdgePlacement,
  CenterSlot,
  CenterPieceId,
  CenterPlacement,
  PiecePlacementView,
} from './materializer.js';

// Logical State Serialization (from serialization.ts)
export {
  serializeLogicalState,
  deserializeLogicalState,
} from './serialization.js';
