import { CanvasError } from '../../errors/canvas-error';

export function assertJavaScriptOrTypeScript(filePath: string): 'javascript' | 'typescript' {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs') || lower.endsWith('.cjs'))
    return 'javascript';
  throw new CanvasError('INVALID_LANGUAGE', `Unsupported file extension for: ${filePath}`, { filePath });
}

