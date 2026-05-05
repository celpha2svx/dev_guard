import { CanvasState } from '../types/schemas';
import { parseFileSignals } from '../parser/code-parser';

export function applyFileChange(
  state: CanvasState,
  filePath: string,
  previousContent: string,
  nextContent: string
): CanvasState {
  const prev = parseFileSignals(filePath, previousContent);
  const next = parseFileSignals(filePath, nextContent);
  const prevRoutes = new Set(prev.routes.map((r) => `${r.method}:${r.path}`));
  const newRoutes = next.routes.filter((r) => !prevRoutes.has(`${r.method}:${r.path}`));
  if (newRoutes.length === 0) return state;

  const now = new Date().toISOString();
  return {
    ...state,
    nodes: state.nodes.map((n) =>
      n.label === 'API Service'
        ? { ...n, badges: Array.from(new Set([...(n.badges ?? []), 'New routes detected'])), metadata: { ...n.metadata, updated_at: now, version: n.metadata.version + 1 } }
        : n
    ),
    metadata: { ...state.metadata, updated_at: now }
  };
}

