// src/types.ts
export type Domain = 'security' | 'system_design' | 'devops' | 'software_engineering';
export type Tier = 'non_negotiable' | 'core' | 'extensible';
export type EnforceMode = 'prevention' | 'intervention' | 'verification';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type EvaluationType = 'static_analysis' | 'pattern_match' | 'ast_walk' | 'config_audit' | 'heuristic';
export type FixType = 'auto_refactor' | 'suggestion' | 'template_injection' | 'dependency_swap';
export type UserTier = 'beginner' | 'intermediate' | 'advanced';
export type Action = 'block' | 'warn' | 'suggest' | 'allow';
export type ExplanationDepth = 'full' | 'summary' | 'none';

export interface PrincipleDefinition {
  principle_id: string;
  domain: Domain;
  category: string;
  tier: Tier;
  enforce_mode: EnforceMode;
  rule: {
    name: string;
    description: string;
    triggers: string[];
    severity: Severity;
  };
  evaluation: {
    type: EvaluationType;
    patterns: string[];
    negatives: string[];
    confidence_threshold: number;
  };
  education: {
    why: string;
    how: string;
    failure_example: string;
    lesson_id: string;
    analogy: string;
  };
  fix: {
    available: boolean;
    fix_type: FixType;
    template: string;
    variables: string[];
  };
  tier_behavior: {
    beginner: { action: Action; explanation_depth: ExplanationDepth; requires_acknowledgment: boolean };
    intermediate: { action: Action; explanation_depth: ExplanationDepth; requires_acknowledgment: boolean };
    advanced: { action: Action; explanation_depth: ExplanationDepth; requires_acknowledgment: boolean; allow_override: boolean };
  };
  metadata: {
    version: string;
    source: string;
    last_updated: string;
    tags: string[];
  };
}

export interface EvaluationResult {
  evaluation_id: string;
  principle_id: string;
  file_path: string;
  line_range: { start: number; end: number };
  status: 'pass' | 'fail' | 'warn' | 'error';
  severity: Severity;
  confidence: number;
  finding: {
    message: string;
    code_snippet: string;
    context: string;
  };
  explanation: {
    why: string;
    how: string;
    failure_example: string;
    analogy: string;
  };
  fix: {
    available: boolean;
    fix_type: string;
    suggested_code: string;
    diff: string;
    variables_needed: string[];
  };
  tier_action: {
    current_tier: UserTier;
    required_action: Action;
    can_override: boolean;
    override_reason_required: boolean;
  };
  chain_reasoning: {
    agent: string;
    steps: string[];
    evidence: string[];
  };
}

export interface TierConfig {
  user_id: string;
  global_tier: UserTier;
  adaptive_mode: boolean;
  domain_mastery: {
    security: { demonstrated_principles: string[]; tier: UserTier };
    system_design: { demonstrated_principles: string[]; tier: UserTier };
    devops: { demonstrated_principles: string[]; tier: UserTier };
    software_engineering: { demonstrated_principles: string[]; tier: UserTier };
  };
  override_history: Array<{
    principle_id: string;
    timestamp: string;
    justification: string;
    outcome: 'success' | 'caused_issue' | 'unknown';
  }>;
}

export interface EvaluationContext {
  userId: string;
  projectType: string;
  framework?: string;
  tierOverride?: string;
  principlesFilter?: string[];
}

export interface DecisionOption {
  name: string;
  type: string;
  features?: string[];
  [key: string]: any;
}

export interface DecisionEvaluation {
  decision_id: string;
  decision_type: string;
  context: EvaluationContext;
  options: Array<{
    name: string;
    evaluation: {
      security_score: number;
      scalability_score: number;
      complexity_score: number;
      recommendations: string[];
      warnings: string[];
    };
  }>;
  recommendation: {
    choice: string;
    reasoning: string;
    trade_offs: string[];
  };
}

export interface Lesson {
  lesson_id: string;
  principle_id: string;
  tier: UserTier;
  content: {
    why: string;
    how: string;
    failure_example: string;
    analogy: string;
    steps: string[];
    resources: string[];
  };
}

export interface LabConfiguration {
  lab_id: string;
  principle_id: string;
  tier: UserTier;
  docker_config: {
    image: string;
    ports: string[];
    volumes: string[];
    environment: Record<string, string>;
  };
  tasks: Array<{
    id: string;
    description: string;
    validation: string;
  }>;
}

export interface FixSuggestion {
  principle_id: string;
  fix_type: FixType;
  original_code: string;
  suggested_code: string;
  diff: string;
  variables: Record<string, string>;
}

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PrinciplesEngine {
  loadPrinciples(domain?: string, tier?: string): Promise<PrincipleDefinition[]>;
  addCustomPrinciple(principle: PrincipleDefinition): Promise<boolean>;
  validatePrincipleSchema(principle: any): ValidationReport;
  evaluateCode(code: string, language: string, filePath: string, context: EvaluationContext): Promise<EvaluationResult[]>;
  evaluateDecision(decisionType: string, options: DecisionOption[], context: EvaluationContext): Promise<DecisionEvaluation>;
  getLesson(principleId: string, tier: string): Promise<Lesson>;
  getLab(principleId: string, tier: string): Promise<LabConfiguration>;
  getTierConfig(userId: string): Promise<TierConfig>;
  updateTier(userId: string, domain: string, principleId: string, passed: boolean): Promise<TierConfig>;
  generateFix(result: EvaluationResult): Promise<FixSuggestion>;
  applyFix(code: string, fix: FixSuggestion): Promise<string>;
}