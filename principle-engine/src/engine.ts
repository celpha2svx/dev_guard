// src/engine.ts
import { v4 as uuidv4 } from 'uuid';
import {
  PrinciplesEngine,
  PrincipleDefinition,
  EvaluationResult,
  EvaluationContext,
  DecisionEvaluation,
  DecisionOption,
  Lesson,
  LabConfiguration,
  TierConfig,
  FixSuggestion,
  ValidationReport,
  UserTier
} from './types';
import { PRINCIPLES } from './principles/definitions';
import { PatternMatcher } from './core/pattern-matcher';
import { ASTWalker } from './core/ast-walker';
import { ConfigAuditor } from './core/config-auditor';
import { TierManager } from './core/tier-manager';
import { FixGenerator } from './core/fix-generator';
import { EducationProvider } from './core/education-provider';

export class Engine implements PrinciplesEngine {
  private principles: PrincipleDefinition[];
  private patternMatcher: PatternMatcher;
  private astWalker: ASTWalker;
  private configAuditor: ConfigAuditor;
  private tierManager: TierManager;
  private fixGenerator: FixGenerator;
  private educationProvider: EducationProvider;

  constructor() {
    this.principles = [...PRINCIPLES];
    this.patternMatcher = new PatternMatcher();
    this.astWalker = new ASTWalker();
    this.configAuditor = new ConfigAuditor();
    this.tierManager = new TierManager();
    this.fixGenerator = new FixGenerator();
    this.educationProvider = new EducationProvider();
  }

  async loadPrinciples(domain?: string, tier?: string): Promise<PrincipleDefinition[]> {
    let filtered = this.principles;
    
    if (domain) {
      filtered = filtered.filter(p => p.domain === domain);
    }
    
    if (tier) {
      filtered = filtered.filter(p => p.tier === tier);
    }
    
    return filtered;
  }

  async addCustomPrinciple(principle: PrincipleDefinition): Promise<boolean> {
    const validation = this.validatePrincipleSchema(principle);
    
    if (!validation.valid) {
      return false;
    }
    
    this.principles.push(principle);
    return true;
  }

  validatePrincipleSchema(principle: any): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    const requiredFields = [
      'principle_id', 'domain', 'category', 'tier', 'enforce_mode',
      'rule', 'evaluation', 'education', 'fix', 'tier_behavior', 'metadata'
    ];
    
    for (const field of requiredFields) {
      if (!(field in principle)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate principle_id format
    if (principle.principle_id && !/^[a-z0-9-]+$/.test(principle.principle_id)) {
      errors.push('principle_id must be kebab-case');
    }
    
    // Validate domain
    const validDomains = ['security', 'system_design', 'devops', 'software_engineering'];
    if (principle.domain && !validDomains.includes(principle.domain)) {
      errors.push(`Invalid domain: ${principle.domain}`);
    }
    
    // Validate tier
    const validTiers = ['non_negotiable', 'core', 'extensible'];
    if (principle.tier && !validTiers.includes(principle.tier)) {
      errors.push(`Invalid tier: ${principle.tier}`);
    }
    
    // Validate severity
    if (principle.rule?.severity) {
      const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
      if (!validSeverities.includes(principle.rule.severity)) {
        errors.push(`Invalid severity: ${principle.rule.severity}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async evaluateCode(
    code: string,
    language: string,
    filePath: string,
    context: EvaluationContext
  ): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    
    // Get user tier
    const tierConfig = await this.tierManager.getTierConfig(context.userId);
    let tier: UserTier = context.tierOverride as UserTier || tierConfig.global_tier;
    
    // Filter principles
    let applicablePrinciples = this.principles;
    if (context.principlesFilter && context.principlesFilter.length > 0) {
      applicablePrinciples = this.principles.filter(p => 
        context.principlesFilter!.includes(p.principle_id)
      );
    }
    
    // Evaluate each principle
    for (const principle of applicablePrinciples) {
      let result: EvaluationResult | null = null;
      
      // Choose evaluator based on type
      switch (principle.evaluation.type) {
        case 'pattern_match':
          result = this.patternMatcher.evaluate(code, principle, filePath, tier);
          break;
        
        case 'ast_walk':
          // Only use AST walker for JavaScript/TypeScript
          if (['javascript', 'typescript', 'js', 'ts'].includes(language.toLowerCase())) {
            result = this.astWalker.evaluate(code, principle, filePath, tier);
          }
          break;
        
        case 'config_audit':
          result = this.configAuditor.evaluate(code, principle, filePath, tier);
          break;
        
        case 'heuristic':
          // Not implemented in v1
          break;
        
        case 'static_analysis':
          // Use pattern matcher as fallback
          result = this.patternMatcher.evaluate(code, principle, filePath, tier);
          break;
      }
      
      if (result) {
        results.push(result);
      }
    }
    
    // If no failures, return a pass result for the first applicable principle
    if (results.length === 0 && applicablePrinciples.length > 0) {
      const passResult: EvaluationResult = {
        evaluation_id: uuidv4(),
        principle_id: applicablePrinciples[0].principle_id,
        file_path: filePath,
        line_range: { start: 1, end: 1 },
        status: 'pass',
        severity: 'info',
        confidence: 1.0,
        finding: {
          message: 'No security issues found',
          code_snippet: '',
          context: ''
        },
        explanation: {
          why: '',
          how: '',
          failure_example: '',
          analogy: ''
        },
        fix: {
          available: false,
          fix_type: '',
          suggested_code: '',
          diff: '',
          variables_needed: []
        },
        tier_action: {
          current_tier: tier,
          required_action: 'allow',
          can_override: false,
          override_reason_required: false
        },
        chain_reasoning: {
          agent: 'engine',
          steps: ['No violations detected'],
          evidence: []
        }
      };
      results.push(passResult);
    }
    
    return results;
  }

  async evaluateDecision(
    decisionType: string,
    options: DecisionOption[],
    context: EvaluationContext
  ): Promise<DecisionEvaluation> {
    const evaluations = options.map(option => {
      const securityScore = this.calculateSecurityScore(option, context);
      const scalabilityScore = this.calculateScalabilityScore(option, context);
      const complexityScore = this.calculateComplexityScore(option, context);
      
      return {
        name: option.name,
        evaluation: {
          security_score: securityScore,
          scalability_score: scalabilityScore,
          complexity_score: complexityScore,
          recommendations: this.getRecommendations(option, context),
          warnings: this.getWarnings(option, context)
        }
      };
    });
    
    // Recommend the option with highest combined score
    const scored = evaluations.map(e => ({
      ...e,
      totalScore: e.evaluation.security_score * 0.4 + 
                  e.evaluation.scalability_score * 0.3 + 
                  (10 - e.evaluation.complexity_score) * 0.3
    }));
    
    scored.sort((a, b) => b.totalScore - a.totalScore);
    const best = scored[0];
    
    return {
      decision_id: uuidv4(),
      decision_type: decisionType,
      context,
      options: evaluations,
      recommendation: {
        choice: best.name,
        reasoning: `Best overall score (${best.totalScore.toFixed(1)}) considering security, scalability, and complexity`,
        trade_offs: this.getTradeOffs(best, options)
      }
    };
  }

  async getLesson(principleId: string, tier: string): Promise<Lesson> {
    return this.educationProvider.getLesson(principleId, tier);
  }

  async getLab(principleId: string, tier: string): Promise<LabConfiguration> {
    return this.educationProvider.getLab(principleId, tier);
  }

  async getTierConfig(userId: string): Promise<TierConfig> {
    return this.tierManager.getTierConfig(userId);
  }

  async updateTier(
    userId: string,
    domain: string,
    principleId: string,
    passed: boolean
  ): Promise<TierConfig> {
    return this.tierManager.updateTier(userId, domain, principleId, passed);
  }

  async generateFix(result: EvaluationResult): Promise<FixSuggestion> {
    return this.fixGenerator.generateFix(result);
  }

  async applyFix(code: string, fix: FixSuggestion): Promise<string> {
    return this.fixGenerator.applyFix(code, fix);
  }

  private calculateSecurityScore(option: DecisionOption, context: EvaluationContext): number {
    // Simplified security scoring
    const securityFeatures = [
      'authentication',
      'authorization',
      'encryption',
      'audit-logging',
      'mfa'
    ];
    
    if (option.features) {
      const matchCount = option.features.filter(f => 
        securityFeatures.some(sf => f.toLowerCase().includes(sf))
      ).length;
      return Math.min(10, 5 + matchCount);
    }
    
    return 5;
  }

  private calculateScalabilityScore(option: DecisionOption, context: EvaluationContext): number {
    // Simplified scalability scoring
    const scalabilityFeatures = [
      'horizontal-scaling',
      'clustering',
      'sharding',
      'caching',
      'load-balancing'
    ];
    
    if (option.features) {
      const matchCount = option.features.filter(f => 
        scalabilityFeatures.some(sf => f.toLowerCase().includes(sf))
      ).length;
      return Math.min(10, 3 + matchCount * 1.5);
    }
    
    return 5;
  }

  private calculateComplexityScore(option: DecisionOption, context: EvaluationContext): number {
    // Lower is better
    const complexityFactors = [
      'configuration',
      'setup',
      'maintenance',
      'migration',
      'learning-curve'
    ];
    
    if (option.features) {
      const matchCount = option.features.filter(f => 
        complexityFactors.some(cf => f.toLowerCase().includes(cf))
      ).length;
      return Math.min(10, 2 + matchCount);
    }
    
    return 3;
  }

  private getRecommendations(option: DecisionOption, context: EvaluationContext): string[] {
    return [
      'Review security documentation',
      'Enable logging and monitoring',
      'Regular security updates'
    ];
  }

  private getWarnings(option: DecisionOption, context: EvaluationContext): string[] {
    return [
      'Verify community support',
      'Check for known vulnerabilities',
      'Test for performance impact'
    ];
  }

  private getTradeOffs(best: any, options: DecisionOption[]): string[] {
    return [
      'Security vs Speed of development',
      'Scalability vs Complexity',
      'Cost vs Features'
    ];
  }
}