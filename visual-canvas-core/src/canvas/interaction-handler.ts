import { CanvasError } from '../errors/canvas-error';
import { CanvasState } from '../types/schemas';

export function moveNode(state: CanvasState, nodeId: string, x: number, y: number): CanvasState {
  const node = state.nodes.find((n) => n.node_id === nodeId);
  if (!node) throw new CanvasError('INVALID_STATE', `Node not found: ${nodeId}`, { nodeId });
  const now = new Date().toISOString();
  return {
    ...state,
    nodes: state.nodes.map((n) =>
      n.node_id === nodeId
        ? { ...n, position: { ...n.position, x, y }, metadata: { ...n.metadata, updated_at: now, version: n.metadata.version + 1 } }
        : n
    ),
    layout: { ...state.layout, user_modified: true, algorithm: 'manual' },
    metadata: { ...state.metadata, updated_at: now }
  };
}

