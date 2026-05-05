import { CanvasNode, CanvasState, Phase1EvaluationLike } from '../types/schemas';

const BORDER_COLORS = {
  secure: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  unknown: '#94a3b8',
  not_applicable: '#94a3b8'
} as const;

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

function principlesForNodeType(nodeType: string): string[] {
  // Minimal v1 mapping needed for contract tests; can be expanded per spec Section 5.1.
  if (nodeType === 'auth_service') return ['P4', 'P5'];
  if (nodeType === 'service') return ['P1', 'P2', 'P6', 'P7'];
  if (nodeType === 'database') return ['P3', 'P7'];
  return ['P1', 'P7'];
}

function overallFromStatuses(statuses: Array<'pass' | 'fail' | 'warn'>): 'secure' | 'warning' | 'critical' | 'unknown' {
  if (statuses.includes('fail')) return 'critical';
  if (statuses.includes('warn')) return 'warning';
  if (statuses.length > 0 && statuses.every((s) => s === 'pass')) return 'secure';
  return 'unknown';
}

function attachToNode(node: CanvasNode, results: Phase1EvaluationLike[], now: string): CanvasNode {
  const nodeFiles = new Set(node.source.file_paths.map(normalizePath));
  const matched = results.filter((r) => {
    const fp = normalizePath(r.file_path);
    if (nodeFiles.has(fp)) return true;
    // allow absolute → relative match
    for (const f of nodeFiles) {
      if (fp.endsWith('/' + f) || fp.endsWith('\\' + f)) return true;
    }
    return false;
  });

  const principles = matched
    .filter((r) => r.status === 'pass' || r.status === 'fail' || r.status === 'warn')
    .map((r) => ({
      principle_id: r.principle_id,
      status: r.status as 'pass' | 'fail' | 'warn',
      severity: (r.severity === 'info' ? 'low' : (r.severity as any)),
      finding_count: 1
    }));

  const statuses = principles.map((p) => p.status);
  const overall = overallFromStatuses(statuses);

  const completed = principles.filter((p) => p.status === 'pass').map((p) => p.principle_id);
  const pending = principles.filter((p) => p.status !== 'pass').map((p) => p.principle_id);
  const principle_ids = Array.from(new Set([...principlesForNodeType(node.type), ...principles.map((p) => p.principle_id)]));

  return {
    ...node,
    security_status: { overall, principles, last_scan: now },
    principles_checklist: {
      attached: true,
      principle_ids,
      completed: Array.from(new Set(completed)),
      pending: Array.from(new Set(pending))
    },
    style: {
      ...node.style,
      border_color: BORDER_COLORS[overall],
      border_width: overall === 'critical' ? 4 : overall === 'warning' ? 3 : 2
    }
  };
}

export function attachSecurityStatus(state: CanvasState, evaluationResults: Phase1EvaluationLike[]): CanvasState {
  const now = new Date().toISOString();
  return {
    ...state,
    nodes: state.nodes.map((n) => attachToNode(n, evaluationResults, now)),
    metadata: { ...state.metadata, updated_at: now }
  };
}

