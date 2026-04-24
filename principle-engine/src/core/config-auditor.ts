// src/core/config-auditor.ts
import { PrincipleDefinition, EvaluationResult, UserTier } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ConfigAuditor {
  evaluate(
    code: string,
    principle: PrincipleDefinition,
    filePath: string,
    tier: UserTier
  ): EvaluationResult | null {
    // Config audit for infrastructure and configuration files
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
      
      // Principle-specific checks
      if (principle.principle_id === 'auth-baseline-mfa') {
        if (this.detectMissingMFA(line, filePath)) {
          return this.buildResult(principle, filePath, i + 1, line, lines.slice(Math.max(0, i - 3), i + 4).join('\n'), tier);
        }
      }
      
      if (principle.principle_id === 'dependency-hygiene') {
        if (this.detectDependencyIssue(line, filePath)) {
          return this.buildResult(principle, filePath, i + 1, line, lines.slice(Math.max(0, i - 3), i + 4).join('\n'), tier);
        }
      }
      
      if (principle.principle_id === 'api-rate-limiting') {
        if (this.detectMissingRateLimit(line, filePath)) {
          return this.buildResult(principle, filePath, i + 1, line, lines.slice(Math.max(0, i - 3), i + 4).join('\n'), tier);
        }
      }
      
      if (principle.principle_id === 'mobile-certificate-pinning') {
        if (this.detectNoPinning(line)) {
          return this.buildResult(principle, filePath, i + 1, line, lines.slice(Math.max(0, i - 3), i + 4).join('\n'), tier);
        }
      }
      
      if (principle.principle_id === 'infra-least-privilege-iam') {
        if (this.detectOverlyPermissive(line)) {
          return this.buildResult(principle, filePath, i + 1, line, lines.slice(Math.max(0, i - 3), i + 4).join('\n'), tier);
        }
      }
      
      if (principle.principle_id === 'infra-state-management') {
        if (this.detectStateIssue(line)) {
          return this.buildResult(principle, filePath, i + 1, line, lines.slice(Math.max(0, i - 3), i + 4).join('\n'), tier);
        }
      }
    }
    
    return null;
  }

  private detectMissingMFA(line: string, filePath: string): boolean {
    return (filePath.includes('routes') || filePath.includes('admin')) && 
           (line.includes('app.use') || line.includes('router.')) &&
           !line.includes('mfa') && !line.includes('2fa');
  }

  private detectDependencyIssue(line: string, filePath: string): boolean {
    return (filePath === 'package.json' || filePath === 'requirements.txt') && 
           line.includes('"dependencies"') || line.includes('"devDependencies"');
  }

  private detectMissingRateLimit(line: string, filePath: string): boolean {
    return filePath.includes('app') && 
           line.includes('app.use') && 
           !line.includes('rateLimit');
  }

  private detectNoPinning(line: string): boolean {
    return line.includes('allowsArbitraryLoads') || 
           line.includes('cleartextTrafficPermitted');
  }

  private detectOverlyPermissive(line: string): boolean {
    return (line.includes('"Action"') || line.includes('"Resource"')) && 
           line.includes('*');
  }

  private detectStateIssue(line: string): boolean {
    return line.includes('backend "local"') || 
           line.includes('.tfstate');
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
      confidence: 0.85,
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
        suggested_code: principle.fix.template,
        diff: `+ ${principle.fix.template}`,
        variables_needed: principle.fix.variables
      },
      tier_action: {
        current_tier: tier,
        required_action: requiredAction,
        can_override: allowOverride,
        override_reason_required: allowOverride
      },
      chain_reasoning: {
        agent: 'config-auditor',
        steps: [
          `Config audit on: ${filePath}`,
          `Detected config issue: ${principle.rule.name}`,
          `Found at line ${lineNumber}`
        ],
        evidence: [line]
      }
    };
  }
}
