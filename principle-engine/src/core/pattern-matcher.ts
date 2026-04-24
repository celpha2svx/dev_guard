// src/core/pattern-matcher.ts
import { PrincipleDefinition, EvaluationResult, UserTier } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PatternMatcher {
  evaluate(
    code: string,
    principle: PrincipleDefinition,
    filePath: string,
    tier: UserTier
  ): EvaluationResult | null {
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check negatives first
      let hasNegative = false;
      for (const negative of principle.evaluation.negatives) {
        if (new RegExp(negative).test(line)) {
          hasNegative = true;
          break;
        }
      }
      
      if (hasNegative) continue;
      
      // Check positive patterns
      for (const pattern of principle.evaluation.patterns) {
        const regex = this.compileRegex(pattern);
        const match = regex.exec(line);
        
        if (match) {
          const confidence = this.calculateConfidence(line, principle);
          
          if (confidence >= principle.evaluation.confidence_threshold) {
            return this.buildResult(
              principle,
              filePath,
              i + 1,
              line,
              lines.slice(Math.max(0, i - 3), i + 4).join('\n'),
              match[0],
              tier,
              confidence
            );
          }
        }
      }
    }
    
    return null;
  }

  private compileRegex(pattern: string): RegExp {
    // Support inline PCRE-style flag groups like (?i) at the start of the pattern.
    // Only a subset maps to JS RegExp flags.
    const inlineFlagsMatch = pattern.match(/^\(\?([gimsuy]+)\)/);
    if (!inlineFlagsMatch) {
      return new RegExp(pattern);
    }

    const flags = inlineFlagsMatch[1];
    const source = pattern.slice(inlineFlagsMatch[0].length);
    return new RegExp(source, flags);
  }

  private calculateConfidence(code: string, principle: PrincipleDefinition): number {
    // Simple confidence calculation based on match quality
    let confidence = 0.85;
    
    // Increase confidence for specific patterns
    if (principle.principle_id === 'secrets-zero-touch' && 
        /AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{24,}|ghp_[0-9a-zA-Z]{36}/.test(code)) {
      confidence = 0.95;
    }
    
    return confidence;
  }

  private buildResult(
    principle: PrincipleDefinition,
    filePath: string,
    lineNumber: number,
    line: string,
    context: string,
    match: string,
    tier: UserTier,
    confidence: number
  ): EvaluationResult {
    const isAdvanced = tier === 'advanced';
    const requiredAction = isAdvanced
      ? principle.tier_behavior.advanced.action
      : tier === 'intermediate'
        ? principle.tier_behavior.intermediate.action
        : principle.tier_behavior.beginner.action;
    const allowOverride = isAdvanced ? principle.tier_behavior.advanced.allow_override : false;
    
    const result: EvaluationResult = {
      evaluation_id: uuidv4(),
      principle_id: principle.principle_id,
      file_path: filePath,
      line_range: { start: lineNumber, end: lineNumber },
      status: 'fail',
      severity: principle.rule.severity,
      confidence,
      finding: {
        message: `${principle.rule.name}: ${principle.rule.description}`,
        code_snippet: match,
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
        suggested_code: this.generateSuggestedCode(principle, match),
        diff: this.generateDiff(match, principle),
        variables_needed: principle.fix.variables
      },
      tier_action: {
        current_tier: tier,
        required_action: requiredAction,
        can_override: allowOverride,
        override_reason_required: allowOverride
      },
      chain_reasoning: {
        agent: 'pattern-matcher',
        steps: [
          `Scanned file: ${filePath}`,
          `Applied pattern: ${principle.evaluation.patterns.join(', ')}`,
          `Found match at line ${lineNumber}`,
          `Confidence: ${confidence}`
        ],
        evidence: [match]
      }
    };

    return result;
  }

  private generateSuggestedCode(principle: PrincipleDefinition, match: string): string {
    if (principle.principle_id === 'secrets-zero-touch') {
      const varMatch = match.match(/(?:const|let|var)\s+(\w+)/);
      const varName = varMatch ? varMatch[1] : 'api_key';
      const envName = varName.toUpperCase().replace(/-/g, '_');
      return `const ${varName} = process.env.${envName};`;
    }
    
    if (principle.principle_id === 'auth-baseline-password') {
      return 'const hash = await bcrypt.hash(password, 12);';
    }
    
    if (principle.principle_id === 'secure-communication-tls') {
      return match.replace('http://', 'https://');
    }
    
    return principle.fix.template;
  }

  private generateDiff(match: string, principle: PrincipleDefinition): string {
    const suggested = this.generateSuggestedCode(principle, match);
    return `- ${match}\n+ ${suggested}`;
  }
}
