import { CanvasError } from '../errors/canvas-error';
import { CanvasState } from '../types/schemas';

export function exportToJSON(state: CanvasState): string {
  return JSON.stringify(state, null, 2);
}

export function importFromJSON(json: string): CanvasState {
  try {
    return JSON.parse(json) as CanvasState;
  } catch (err: any) {
    throw new CanvasError('INVALID_INPUT', 'Invalid JSON for CanvasState', { error: String(err?.message ?? err) });
  }
}

