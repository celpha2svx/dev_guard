import { promises as fs } from 'fs';
import * as path from 'path';

import {
  applyFileChange,
  attachSecurityStatus,
  detectArchitecture,
  detectionToCanvasState,
  exportToJSON,
  generateCodeStub,
  importFromJSON,
  loadCanvas,
  moveNode,
  renderToSVG,
  saveCanvas
} from '../index';

function expressFixture() {
  const serverTs = `
import express from 'express';
const app = express();
app.get('/users', (req, res) => res.json([]));
app.listen(3000);
`;
  const dbTs = `
import mongoose from 'mongoose';
export async function connectDb() {
  await mongoose.connect('mongodb://localhost:27017/test');
}
`;
  const authTs = `
import passport from 'passport';
passport.use({} as any);
`;

  return {
    files: [
      { path: 'server.ts', content: serverTs },
      { path: 'db.ts', content: dbTs },
      { path: 'auth.ts', content: authTs }
    ],
    serverTs,
    dbTs,
    authTs
  };
}

describe('PHASE 2 Visual Canvas Core - Section 8 contract', () => {
  test('TEST 1: Node Detection - Express App', () => {
    const { files } = expressFixture();
    const result = detectArchitecture(files);

    expect(result.detected_nodes).toHaveLength(3);
    expect(result.detected_edges).toHaveLength(2);

    const labels = result.detected_nodes.map((n) => n.label).sort();
    expect(labels).toEqual(['API Service', 'Authentication', 'Database'].sort());

    const byLabel = new Map(result.detected_nodes.map((n) => [n.label, n]));
    expect(byLabel.get('API Service')?.type).toBe('service');
    expect(byLabel.get('Database')?.type).toBe('database');
    expect(byLabel.get('Authentication')?.type).toBe('auth_service');

    for (const n of result.detected_nodes) {
      expect(n.confidence).toBeGreaterThan(0.8);
    }

    const edgePairs = result.detected_edges.map((e) => `${e.source_label}->${e.target_label}`).sort();
    expect(edgePairs).toEqual(['API Service->Authentication', 'API Service->Database'].sort());
  });

  test('TEST 2: Security Status Attachment', () => {
    const { files } = expressFixture();
    const detection = detectArchitecture(files);
    const state = detectionToCanvasState(detection, 'C:\\project');

    const withSecurity = attachSecurityStatus(state, [
      { file_path: 'auth.ts', principle_id: 'P4', status: 'pass', severity: 'medium', confidence: 0.9 },
      { file_path: 'auth.ts', principle_id: 'P5', status: 'fail', severity: 'high', confidence: 0.9 },
      { file_path: 'server.ts', principle_id: 'P2', status: 'pass', severity: 'low', confidence: 0.9 },
      { file_path: 'server.ts', principle_id: 'P6', status: 'pass', severity: 'low', confidence: 0.9 }
    ]);

    const authNode = withSecurity.nodes.find((n) => n.label === 'Authentication')!;
    const serviceNode = withSecurity.nodes.find((n) => n.label === 'API Service')!;

    expect(authNode.style.border_color).toBe('#ef4444');
    expect(authNode.principles_checklist.pending).toContain('P5');

    expect(serviceNode.style.border_color).toBe('#22c55e');
  });

  test('TEST 3: User Layout Persistence', async () => {
    const { files } = expressFixture();
    const detection = detectArchitecture(files);

    const projectRoot = path.join(__dirname, 'tmp-project-layout');
    await fs.rm(projectRoot, { recursive: true, force: true });
    await fs.mkdir(projectRoot, { recursive: true });

    try {
      const state = detectionToCanvasState(detection, projectRoot);
      const serviceNode = state.nodes.find((n) => n.label === 'API Service')!;
      const moved = moveNode(state, serviceNode.node_id, 300, 200);

      await saveCanvas(moved);

      const reloaded = await loadCanvas(projectRoot);
      expect(reloaded).not.toBeNull();
      const reloadedService = reloaded!.nodes.find((n) => n.label === 'API Service')!;
      expect(reloadedService.position.x).toBe(300);
      expect(reloadedService.position.y).toBe(200);
      expect(reloaded!.layout.user_modified).toBe(true);

      const principlesDir = path.join(projectRoot, '.principles');
      const stat = await fs.stat(principlesDir);
      expect(stat.isDirectory()).toBe(true);
    } finally {
      await fs.rm(projectRoot, { recursive: true, force: true });
    }
  });

  test('TEST 4: Visual-to-Code Stub', () => {
    const stub = generateCodeStub({ type: 'service', label: 'Email Service' } as any);
    expect(stub.language).toBe('typescript');
    expect(stub.fileName).toBe('email.service.ts');
    expect(stub.content).toContain('class EmailService');
    expect(stub.content).toContain('async init');
    expect(stub.principlesToImplement).toEqual(expect.arrayContaining(['P1', 'P7']));
  });

  test('TEST 5: File Change Detection', () => {
    const { files, serverTs } = expressFixture();
    const detection = detectArchitecture(files);
    const state = detectionToCanvasState(detection, 'C:\\project');

    const nextServer = `
import express from 'express';
const app = express();
app.get('/users', (req, res) => res.json([]));
app.get('/orders', (req, res) => res.json([]));
app.listen(3000);
`;
    const updated = applyFileChange(state, 'server.ts', serverTs, nextServer);
    const serviceNode = updated.nodes.find((n) => n.label === 'API Service')!;
    expect(serviceNode.badges ?? []).toContain('New routes detected');
  });

  test('TEST 6: Canvas Export', () => {
    const { files } = expressFixture();
    const detection = detectArchitecture(files);
    const state = detectionToCanvasState(detection, 'C:\\project');
    const json = exportToJSON(state);
    const imported = importFromJSON(json);
    expect(imported.project_path).toBe(state.project_path);
    expect(imported.nodes).toHaveLength(3);
    expect(imported.edges).toHaveLength(2);

    const svg = renderToSVG(imported);
    expect(svg).toContain('<svg');
    expect(svg).toContain('API Service');
  });
});

