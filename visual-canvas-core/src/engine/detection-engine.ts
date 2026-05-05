import { v4 as uuidv4 } from 'uuid';
import { parseFileSignals, ParsedFileSignals } from '../parser/code-parser';
import { applySimpleLayout } from './layout-engine';
import { CanvasEdgeType, CanvasNodeType, DetectionResult, NodeLineRange } from '../types/schemas';

export interface ProjectFileInput {
  path: string;
  content: string;
}

function relPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.?\//, '');
}

function lr(file: string, line?: number): NodeLineRange[] {
  if (!line) return [];
  return [{ file: relPath(file), start: line, end: line }];
}

function confidenceForSignals(signals: ParsedFileSignals): number {
  if (signals.hasExpressListen) return 0.92;
  if (signals.hasMongooseConnect) return 0.93;
  if (signals.hasPassportUse) return 0.91;
  return 0.5;
}

export function detectArchitecture(files: ProjectFileInput[]): DetectionResult {
  const parsed = files.map((f) => parseFileSignals(f.path, f.content));

  const nodes: DetectionResult['detected_nodes'] = [];
  const edges: DetectionResult['detected_edges'] = [];

  const expressFiles = parsed.filter((p) => p.hasExpressListen || p.routes.length > 0);
  const mongooseFiles = parsed.filter((p) => p.hasMongooseConnect);
  const passportFiles = parsed.filter((p) => p.hasPassportUse);

  if (expressFiles.length > 0) {
    const file_paths = expressFiles.map((p) => relPath(p.filePath));
    const line_ranges = expressFiles.flatMap((p) => lr(p.filePath, p.lineHints.expressLine));
    nodes.push({
      type: 'service',
      label: 'API Service',
      file_paths,
      line_ranges,
      confidence: Math.min(0.99, Math.max(...expressFiles.map(confidenceForSignals))),
      detection_method: 'ast_parser',
      suggested_position: { x: 100, y: 100 }
    });
  }

  if (mongooseFiles.length > 0) {
    const file_paths = mongooseFiles.map((p) => relPath(p.filePath));
    const line_ranges = mongooseFiles.flatMap((p) => lr(p.filePath, p.lineHints.mongooseLine));
    nodes.push({
      type: 'database',
      label: 'Database',
      file_paths,
      line_ranges,
      confidence: Math.min(0.99, Math.max(...mongooseFiles.map(confidenceForSignals))),
      detection_method: 'ast_parser',
      suggested_position: { x: 360, y: 100 }
    });
  }

  if (passportFiles.length > 0) {
    const file_paths = passportFiles.map((p) => relPath(p.filePath));
    const line_ranges = passportFiles.flatMap((p) => lr(p.filePath, p.lineHints.passportLine));
    nodes.push({
      type: 'auth_service',
      label: 'Authentication',
      file_paths,
      line_ranges,
      confidence: Math.min(0.99, Math.max(...passportFiles.map(confidenceForSignals))),
      detection_method: 'ast_parser',
      suggested_position: { x: 620, y: 100 }
    });
  }

  const hasService = nodes.some((n) => n.label === 'API Service');
  const hasDb = nodes.some((n) => n.label === 'Database');
  const hasAuth = nodes.some((n) => n.label === 'Authentication');

  if (hasService && hasDb) {
    edges.push({
      source_label: 'API Service',
      target_label: 'Database',
      type: 'database_connection',
      direction: 'directed',
      confidence: 0.9,
      detection_method: 'ast_parser'
    });
  }
  if (hasService && hasAuth) {
    edges.push({
      source_label: 'API Service',
      target_label: 'Authentication',
      type: 'auth_flow',
      direction: 'directed',
      confidence: 0.9,
      detection_method: 'ast_parser'
    });
  }

  return applySimpleLayout({ detected_nodes: nodes, detected_edges: edges });
}

export function detectionToCanvasState(
  result: DetectionResult,
  projectPath: string,
  opts?: { sourceCommit?: string; version?: string }
) {
  const now = new Date().toISOString();
  const version = opts?.version ?? '1.0.0';

  const nodeByLabel = new Map(result.detected_nodes.map((n) => [n.label, uuidv4()]));

  const nodes = result.detected_nodes.map((n) => ({
    node_id: nodeByLabel.get(n.label)!,
    type: n.type as CanvasNodeType,
    label: n.label,
    description: '',
    source: {
      file_paths: n.file_paths,
      line_ranges: n.line_ranges,
      detected_by: 'ast_parser' as const,
      confidence: n.confidence
    },
    security_status: {
      overall: 'unknown' as const,
      principles: [],
      last_scan: ''
    },
    principles_checklist: {
      attached: false,
      principle_ids: [],
      completed: [],
      pending: []
    },
    position: {
      x: n.suggested_position.x,
      y: n.suggested_position.y,
      width: 180,
      height: 100
    },
    style: {
      color: colorForType(n.type),
      icon: '',
      border_width: 2,
      border_color: '#94a3b8'
    },
    metadata: { created_at: now, updated_at: now, version: 1 }
  }));

  const edges = result.detected_edges.map((e) => ({
    edge_id: uuidv4(),
    source_node_id: nodeByLabel.get(e.source_label)!,
    target_node_id: nodeByLabel.get(e.target_label)!,
    type: e.type as CanvasEdgeType,
    label: e.label,
    direction: e.direction,
    style: { color: '#64748b', width: 2, dashed: false },
    metadata: { detected_by: 'ast_parser' as const, confidence: e.confidence }
  }));

  return {
    canvas_id: uuidv4(),
    project_path: projectPath,
    version,
    viewport: { zoom: 1.0, pan_x: 0, pan_y: 0 },
    nodes,
    edges,
    layout: { algorithm: 'auto' as const, auto_arranged: true, user_modified: false },
    generation: {
      last_generated: now,
      source_commit: opts?.sourceCommit ?? '',
      detection_confidence:
        nodes.length === 0 ? 0 : nodes.reduce((sum: number, n: any) => sum + n.source.confidence, 0) / nodes.length
    },
    metadata: { created_at: now, updated_at: now }
  };
}

function colorForType(type: CanvasNodeType): string {
  switch (type) {
    case 'service':
      return '#60a5fa';
    case 'database':
      return '#a78bfa';
    case 'auth_service':
      return '#34d399';
    default:
      return '#94a3b8';
  }
}

