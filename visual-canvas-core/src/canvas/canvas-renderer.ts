import { CanvasState } from '../types/schemas';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
}

export function renderToSVG(state: CanvasState): string {
  const padding = 40;
  const maxX = Math.max(0, ...state.nodes.map((n) => n.position.x + n.position.width)) + padding;
  const maxY = Math.max(0, ...state.nodes.map((n) => n.position.y + n.position.height)) + padding;
  const width = Math.max(800, maxX);
  const height = Math.max(600, maxY);

  const nodeById = new Map(state.nodes.map((n) => [n.node_id, n]));

  const edges = state.edges
    .map((e) => {
      const src = nodeById.get(e.source_node_id);
      const dst = nodeById.get(e.target_node_id);
      if (!src || !dst) return '';
      const x1 = src.position.x + src.position.width;
      const y1 = src.position.y + src.position.height / 2;
      const x2 = dst.position.x;
      const y2 = dst.position.y + dst.position.height / 2;
      const dash = e.style.dashed ? ' stroke-dasharray="6 6"' : '';
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${e.style.color}" stroke-width="${e.style.width}"${dash} />`;
    })
    .join('');

  const nodes = state.nodes
    .map((n) => {
      const badge = n.badges && n.badges.length ? `<text x="${n.position.x + 10}" y="${n.position.y + n.position.height + 18}" font-size="12" fill="#0f172a">${esc(n.badges.join(', '))}</text>` : '';
      return `<g data-node-id="${esc(n.node_id)}">
  <rect x="${n.position.x}" y="${n.position.y}" width="${n.position.width}" height="${n.position.height}" rx="10" ry="10"
    fill="${n.style.color}" stroke="${n.style.border_color}" stroke-width="${n.style.border_width}" />
  <text x="${n.position.x + 12}" y="${n.position.y + 28}" font-size="14" fill="#0f172a" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif">${esc(n.label)}</text>
  ${badge}
</g>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
  ${edges}
  ${nodes}
</svg>`;
}

