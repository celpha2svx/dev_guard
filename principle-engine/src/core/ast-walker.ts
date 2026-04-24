// src/core/ast-walker.ts
import { PrincipleDefinition, EvaluationResult, UserTier } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ASTWalker {
  evaluate(
    code: string,
    principle: PrincipleDefinition,
    filePath: string,
    tier: UserTier
  ): EvaluationResult | null {
    // Simulate AST walking with pattern matching for JavaScript/TypeScript
    // In production, this would use @babel/parser or tree-sitter
    
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check negatives
      let hasNegative = false;
      for (const negative of principle.evaluation.negatives) {
        if (line.includes(negative.replace(/'/g, '').replace(/"/g, ''))) {
          hasNegative = true;
          break;
        }
      }
      
      if (hasNegative) continue;
      
      // AST-specific patterns
      if (principle.principle_id === 'input-fortress-sqli') {
        if (this.detectSQLInjection(line)) {
          return this.buildResult(principle, filePath, i + 1, line, lines.slice(Math.max(0, i - 3), i + 4).join('\n'), tier);
        }
      }
      
      if (principle.principle_id === 'input-fortress-xss') {
        if (this.detectXSS(line)) {
          return this.buildResult(principle, filePath, i + 1, line, lines.slice(Math.max(0, i - 3), i + 4).join('\n'), tier);
        }
      }
      
      if (principle.principle_id === 'error-handling-safe') {
        if (this.detectUnsafeError(line)) {
          return this.buildResult(principle, filePath, i + 1, line, lines.slice(Math.max(0, i - 3), i + 4).join('\n'), tier);
        }
      }
      
      if (principle.principle_id === 'api-broken-object-level-auth') {
        if (this.detectBOLA(line)) {
          return this.buildResult(principle, filePath, i + 1, line, lines.slice(Math.max(0, i - 3), i + 4).join('\n'), tier);
        }
      }
      
      if (principle.principle_id === 'api-excessive-data-exposure') {
        if (this.detectExcessiveData(line)) {
          return this.buildResult(principle, filePath, i + 1, line, lines.slice(Math.max(0, i - 3), i + 4).join('\n'), tier);
        }
      }
    }
    
    return null;
  }

  private detectSQLInjection(line: string): boolean {
    return /\.query\s*\(\s*["'`]/.test(line) && 
           (line.includes('+') || line.includes('${')) &&
           !line.includes('?');
  }

  private detectXSS(line: string): boolean {
    return /innerHTML\s*=/.test(line) || 
           /dangerouslySetInnerHTML/.test(line);
  }

  private detectUnsafeError(line: string): boolean {
    return /res\.send\(err\.stack\)/.test(line) || 
           /res\.json\(\{.*error.*err/.test(line);
  }

  private detectBOLA(line: string): boolean {
    return /route\s*\(\s*['"]\/:(?:id|uuid)/.test(line) && 
           !line.includes('auth');
  }

  private detectExcessiveData(line: string): boolean {
    return /SELECT\s+\*\s+FROM/i.test(line) || 
           /\.findOne\(\)/.test(line) && !line.includes('attributes');
  }

  private buildResult(
    principle: PrincipleDefinition,
    filePath: string,
    lineNumber: number,
    line: string,
    context: string,
    tier: UserTier
  ): EvaluationResult {
    const isAdvanced = tier === 'advanced';
    const requiredAction = isAdvanced
      ? principle.tier_behavior.advanced.action
      : tier === 'intermediate'
        ? principle.tier_behavior.intermediate.action
        : principle.tier_behavior.beginner.action;
    const allowOverride = isAdvanced ? principle.tier_behavior.advanced.allow_override : false;

    return {
      evaluation_id: uuidv4(),
      principle_id: principle.principle_id,
      file_path: filePath,
      line_range: { start: lineNumber, end: lineNumber },
      status: 'fail',
      severity: principle.rule.severity,
      confidence: 0.90,
      finding: {
        message: `${principle.rule.name}: ${principle.rule.description}`,
        code_snippet: line,
        context
      },
      explanation: {
        why: principle.education.why,
        how: principle.education.how,
        failure_example: principle.education.failure_example,
        analogy: tier === 'beginner' ? principle.education.analogy : ''
      },
      fix: {
        available: principle.fix.available,
        fix_type: principle.fix.fix_type,
        suggested_code: this.generateFix(line, principle),
        diff: this.generateDiff(line, principle),
        variables_needed: principle.fix.variables
      },
      tier_action: {
        current_tier: tier,
        required_action: requiredAction,
        can_override: allowOverride,
        override_reason_required: allowOverride
      },
      chain_reasoning: {
        agent: 'ast-walker',
        steps: [
          `AST analysis on: ${filePath}`,
          `Detected pattern: ${principle.rule.name}`,
          `Found violation at line ${lineNumber}`
        ],
        evidence: [line]
      }
    };
  }

  private generateFix(line: string, principle: PrincipleDefinition): string {
    if (principle.principle_id === 'input-fortress-sqli') {
      return line.replace(/\+.*\+/, '?') + `, [${extractUserInput(line)}]`;
    }
    if (principle.principle_id === 'input-fortress-xss') {
      return line.replace('innerHTML', 'textContent');
    }
    return principle.fix.template;
  }

  private generateDiff(line: string, principle: PrincipleDefinition): string {
    const suggested = this.generateFix(line, principle);
    return `- ${line}\n+ ${suggested}`;
  }
}

function extractUserInput(line: string): string {
  const match = line.match(/req\.(?:params|query|body)\.(\w+)/);
  return match ? match[1] : 'userInput';
}
