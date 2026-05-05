export type CanvasNodeType =
  | 'service'
  | 'database'
  | 'api_gateway'
  | 'auth_service'
  | 'frontend'
  | 'external_api'
  | 'message_queue'
  | 'cache'
  | 'storage'
  | 'compute'
  | 'network'
  | 'unknown';

export type CanvasEdgeType =
  | 'http'
  | 'database_connection'
  | 'auth_flow'
  | 'event_stream'
  | 'file_access'
  | 'dependency'
  | 'unknown';

export type OverallSecurityStatus = 'secure' | 'warning' | 'critical' | 'unknown' | 'not_applicable';
export type PrincipleStatus = 'pass' | 'fail' | 'warn';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface NodeLineRange {
  file: string;
  start: number;
  end: number;
}

export interface CanvasNode {
  node_id: string;
  type: CanvasNodeType;
  label: string;
  description: string;
  source: {
    file_paths: string[];
    line_ranges: NodeLineRange[];
    detected_by: 'ast_parser' | 'regex' | 'manual' | 'ai_inference';
    confidence: number;
  };
  security_status: {
    overall: OverallSecurityStatus;
    principles: Array<{
      principle_id: string;
      status: PrincipleStatus;
      severity: Exclude<Severity, 'info'> | 'low';
      finding_count: number;
    }>;
    last_scan: string;
  };
  principles_checklist: {
    attached: boolean;
    principle_ids: string[];
    completed: string[];
    pending: string[];
  };
  position: { x: number; y: number; width: number; height: number };
  style: { color: string; icon: string; border_width: number; border_color: string };
  metadata: { created_at: string; updated_at: string; version: number };
  badges?: string[];
}

export interface CanvasEdge {
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  type: CanvasEdgeType;
  label?: string;
  direction: 'directed' | 'bidirectional';
  security_status?: {
    encrypted?: boolean;
    authenticated?: boolean;
    principle_id?: string;
  };
  style: { color: string; width: number; dashed: boolean };
  metadata: { detected_by: 'ast_parser' | 'regex' | 'manual'; confidence: number };
}

export interface CanvasState {
  canvas_id: string;
  project_path: string;
  version: string;
  viewport: { zoom: number; pan_x: number; pan_y: number };
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  layout: {
    algorithm: 'auto' | 'manual' | 'force-directed' | 'hierarchical';
    auto_arranged: boolean;
    user_modified: boolean;
  };
  generation: {
    last_generated: string;
    source_commit: string;
    detection_confidence: number;
  };
  metadata: { created_at: string; updated_at: string };
}

export interface DetectionResult {
  detected_nodes: Array<{
    type: CanvasNodeType;
    label: string;
    file_paths: string[];
    line_ranges: NodeLineRange[];
    confidence: number;
    detection_method: string;
    suggested_position: { x: number; y: number };
  }>;
  detected_edges: Array<{
    source_label: string;
    target_label: string;
    type: CanvasEdgeType;
    label?: string;
    direction: 'directed' | 'bidirectional';
    confidence: number;
    detection_method: string;
  }>;
}

export interface CodeStub {
  language: 'typescript' | 'javascript';
  fileName: string;
  content: string;
  principlesToImplement: string[];
}

export interface Phase1EvaluationLike {
  principle_id: string;
  file_path: string;
  status: 'pass' | 'fail' | 'warn' | 'error';
  severity: Severity;
  confidence: number;
}

