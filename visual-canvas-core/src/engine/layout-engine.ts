import { DetectionResult } from '../types/schemas';

export function applySimpleLayout(result: DetectionResult): DetectionResult {
  const spacingX = 260;
  const spacingY = 170;
  const startX = 100;
  const startY = 100;
  return {
    ...result,
    detected_nodes: result.detected_nodes.map((n, idx) => ({
      ...n,
      suggested_position: { x: startX + idx * spacingX, y: startY + (idx % 2) * spacingY }
    }))
  };
}

