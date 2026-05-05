import { CanvasNode, CodeStub } from '../types/schemas';

function toKebab(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripServiceSuffix(label: string): string {
  const trimmed = label.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'service') return trimmed;
  if (lower.endsWith(' service')) return trimmed.slice(0, -' service'.length).trim();
  return trimmed;
}

function toClassName(label: string): string {
  return label
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
}

function principlesForNewNode(nodeType: string): string[] {
  if (nodeType === 'service') return ['P1', 'P7'];
  return ['P1', 'P7'];
}

export function generateCodeStub(node: Pick<CanvasNode, 'type' | 'label'>): CodeStub {
  const effectiveLabel = stripServiceSuffix(node.label);
  const className = toClassName(node.label) || 'NewService';
  const slug = toKebab(effectiveLabel) || 'new';
  const fileName = `${slug}.service.ts`;
  const principlesToImplement = principlesForNewNode(node.type);

  const content = `export class ${className} {
  constructor() {}

  async init(): Promise<void> {
    // TODO: initialize service dependencies
  }

  async shutdown(): Promise<void> {
    // TODO: cleanup resources
  }
}
`;

  return { language: 'typescript', fileName, content, principlesToImplement };
}
