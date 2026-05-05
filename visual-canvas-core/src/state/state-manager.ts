import { promises as fs } from 'fs';
import * as path from 'path';
import { CanvasError } from '../errors/canvas-error';
import { CanvasState } from '../types/schemas';

const PRINCIPLES_DIR = '.principles';
const CANVAS_STATE_FILE = 'canvas-state.json';

export function getPrinciplesDir(projectPath: string): string {
  return path.join(projectPath, PRINCIPLES_DIR);
}

export function getCanvasStatePath(projectPath: string): string {
  return path.join(getPrinciplesDir(projectPath), CANVAS_STATE_FILE);
}

export async function ensurePrinciplesDir(projectPath: string): Promise<void> {
  try {
    await fs.mkdir(getPrinciplesDir(projectPath), { recursive: true });
  } catch (err: any) {
    throw new CanvasError('IO_ERROR', `Failed to create ${PRINCIPLES_DIR} directory`, {
      projectPath,
      error: String(err?.message ?? err)
    });
  }
}

export async function saveCanvas(state: CanvasState): Promise<void> {
  await ensurePrinciplesDir(state.project_path);
  const statePath = getCanvasStatePath(state.project_path);
  const now = new Date().toISOString();
  const toWrite: CanvasState = { ...state, metadata: { ...state.metadata, updated_at: now } };
  try {
    await fs.writeFile(statePath, JSON.stringify(toWrite, null, 2), 'utf8');
  } catch (err: any) {
    throw new CanvasError('IO_ERROR', 'Failed to save canvas state', { statePath, error: String(err?.message ?? err) });
  }
}

export async function loadCanvas(projectPath: string): Promise<CanvasState | null> {
  await ensurePrinciplesDir(projectPath);
  const statePath = getCanvasStatePath(projectPath);
  try {
    const data = await fs.readFile(statePath, 'utf8');
    return JSON.parse(data) as CanvasState;
  } catch (err: any) {
    const code = String(err?.code ?? '');
    if (code === 'ENOENT') return null;
    throw new CanvasError('IO_ERROR', 'Failed to load canvas state', { statePath, error: String(err?.message ?? err) });
  }
}

