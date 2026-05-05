export { CanvasError } from './errors/canvas-error';

export type {
  CanvasState,
  CanvasNode,
  CanvasEdge,
  DetectionResult,
  CodeStub,
  Phase1EvaluationLike,
  CanvasNodeType,
  CanvasEdgeType
} from './types/schemas';

export { parseFileSignals } from './parser/code-parser';
export { detectArchitecture, detectionToCanvasState } from './engine/detection-engine';
export { attachSecurityStatus } from './engine/security-integrator';
export { applyFileChange } from './engine/file-change-detector';
export { generateCodeStub } from './engine/stub-generator';
export { renderToSVG } from './canvas/canvas-renderer';
export { moveNode } from './canvas/interaction-handler';
export { ensurePrinciplesDir, saveCanvas, loadCanvas, getCanvasStatePath, getPrinciplesDir } from './state/state-manager';
export { exportToJSON, importFromJSON } from './state/serialization';

