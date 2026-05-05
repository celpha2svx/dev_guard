import { parse } from '@babel/parser';
import { CanvasError } from '../errors/canvas-error';
import { assertJavaScriptOrTypeScript } from './language-adapters/javascript-adapter';
import { TYPESCRIPT_PARSER_PLUGINS } from './language-adapters/typescript-adapter';

export interface ParsedFileSignals {
  filePath: string;
  language: 'javascript' | 'typescript';
  hasExpressListen: boolean;
  routes: Array<{ method: string; path: string; line: number }>;
  hasMongooseConnect: boolean;
  hasPassportUse: boolean;
  lineHints: {
    expressLine?: number;
    mongooseLine?: number;
    passportLine?: number;
  };
}

type AnyNode = any;

function isIdentifier(node: AnyNode, name?: string): boolean {
  return !!node && node.type === 'Identifier' && (name ? node.name === name : true);
}

function isStringLiteral(node: AnyNode): node is { type: string; value: string } {
  return !!node && (node.type === 'StringLiteral' || node.type === 'Literal') && typeof node.value === 'string';
}

function getLocLine(node: AnyNode): number | undefined {
  const loc = node?.loc;
  if (!loc || !loc.start) return undefined;
  return typeof loc.start.line === 'number' ? loc.start.line : undefined;
}

function walk(node: AnyNode, visit: (n: AnyNode) => void): void {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, visit);
    } else if (value && typeof value.type === 'string') {
      walk(value, visit);
    }
  }
}

export function parseFileSignals(filePath: string, code: string): ParsedFileSignals {
  const language = assertJavaScriptOrTypeScript(filePath);
  let ast: AnyNode;
  try {
    ast = parse(code, {
      sourceType: 'unambiguous',
      plugins: language === 'typescript' ? (TYPESCRIPT_PARSER_PLUGINS as any) : ['jsx', 'classProperties']
    }) as any;
  } catch (err: any) {
    throw new CanvasError('PARSE_ERROR', `Failed to parse ${filePath}`, { filePath, error: String(err?.message ?? err) });
  }

  const signals: ParsedFileSignals = {
    filePath,
    language,
    hasExpressListen: false,
    routes: [],
    hasMongooseConnect: false,
    hasPassportUse: false,
    lineHints: {}
  };

  walk(ast, (n) => {
    if (n?.type !== 'CallExpression') return;
    const callee = n.callee;
    if (callee?.type !== 'MemberExpression') return;
    const object = callee.object;
    const property = callee.property;

    if (isIdentifier(object, 'app') && isIdentifier(property, 'listen')) {
      signals.hasExpressListen = true;
      signals.lineHints.expressLine ??= getLocLine(n);
      return;
    }

    if (isIdentifier(object, 'app') && property?.type === 'Identifier') {
      const method = property.name;
      const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete']);
      if (httpMethods.has(method) && Array.isArray(n.arguments) && n.arguments.length > 0) {
        const first = n.arguments[0];
        if (isStringLiteral(first)) {
          signals.routes.push({ method, path: first.value, line: getLocLine(first) ?? getLocLine(n) ?? 1 });
          signals.lineHints.expressLine ??= getLocLine(n);
        }
      }
      return;
    }

    if (isIdentifier(object, 'mongoose') && isIdentifier(property, 'connect')) {
      signals.hasMongooseConnect = true;
      signals.lineHints.mongooseLine ??= getLocLine(n);
      return;
    }

    if (isIdentifier(object, 'passport') && isIdentifier(property, 'use')) {
      signals.hasPassportUse = true;
      signals.lineHints.passportLine ??= getLocLine(n);
      return;
    }
  });

  return signals;
}

