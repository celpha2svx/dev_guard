// src/__tests__/engine.test.ts
import { Engine } from '../engine';
import { EvaluationContext } from '../types';

describe('Principles Engine - Section 6 Tests', () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  // TEST 1: Secrets Detection
  test('TEST 1: Secrets Detection', async () => {
    const code = 'const apiKey = "AKIAIOSFODNN7EXAMPLE";';
    const context: EvaluationContext = {
      userId: 'test-user',
      projectType: 'web_app',
      principlesFilter: ['secrets-zero-touch']
    };

    const results = await engine.evaluateCode(code, 'javascript', 'config.js', context);
    
    expect(results.length).toBeGreaterThan(0);
    
    const secretResult = results.find(r => r.principle_id === 'secrets-zero-touch');
    expect(secretResult).toBeDefined();
    expect(secretResult!.status).toBe('fail');
    expect(secretResult!.severity).toBe('critical');
    expect(secretResult!.tier_action.required_action).toBe('block');
    expect(secretResult!.fix.available).toBe(true);
  });

  // TEST 2: SQL Injection Prevention
  test('TEST 2: SQL Injection Prevention', async () => {
    const code = 'db.query("SELECT * FROM users WHERE id = " + req.params.id)';
    const context: EvaluationContext = {
      userId: 'test-user',
      projectType: 'web_app',
      principlesFilter: ['input-fortress-sqli']
    };

    const results = await engine.evaluateCode(code, 'javascript', 'query.js', context);
    
    expect(results.length).toBeGreaterThan(0);
    
    const sqliResult = results.find(r => r.principle_id === 'input-fortress-sqli');
    expect(sqliResult).toBeDefined();
    expect(sqliResult!.status).toBe('fail');
    expect(sqliResult!.severity).toBe('critical');
    
    // Beginner - block, Intermediate/Advanced - warn
    if (sqliResult!.tier_action.current_tier === 'beginner') {
      expect(sqliResult!.tier_action.required_action).toBe('block');
    } else {
      expect(sqliResult!.tier_action.required_action).toBe('warn');
    }
  });

  // TEST 3: Safe Query (Negative)
  test('TEST 3: Safe Query (Negative)', async () => {
    const code = 'db.query("SELECT * FROM users WHERE id = ?", [req.params.id])';
    const context: EvaluationContext = {
      userId: 'test-user',
      projectType: 'web_app',
      principlesFilter: ['input-fortress-sqli']
    };

    const results = await engine.evaluateCode(code, 'javascript', 'query.js', context);
    
    // Should pass - no findings or pass status
    const sqliResult = results.find(r => r.principle_id === 'input-fortress-sqli');
    expect(sqliResult?.status).toBe('pass');
  });

  // TEST 4: Tier Adaptation
  test('TEST 4: Tier Adaptation', async () => {
    // user1 has demonstrated P1 and P2, so should be intermediate in security
    const code = 'const password = "secret123";';
    const context: EvaluationContext = {
      userId: 'user1',
      projectType: 'web_app',
      principlesFilter: ['secrets-zero-touch']
    };

    const results = await engine.evaluateCode(code, 'javascript', 'newfile.js', context);
    
    expect(results.length).toBeGreaterThan(0);
    
    const result = results[0];
    expect(result.status).toBe('fail');
    
    // Should show intermediate behavior (summary, not full lesson)
    if (result.tier_action.current_tier === 'intermediate') {
      // Intermediate tier should not have full explanation
      expect(result.explanation.analogy).toBe('');
    }
  });

  // TEST 5: Fix Generation
  test('TEST 5: Fix Generation', async () => {
    const code = 'const apiKey = "secret-key-12345";';
    const context: EvaluationContext = {
      userId: 'test-user',
      projectType: 'web_app',
      principlesFilter: ['secrets-zero-touch']
    };

    const results = await engine.evaluateCode(code, 'javascript', 'config.js', context);
    
    expect(results.length).toBeGreaterThan(0);
    
    const result = results[0];
    expect(result.fix.available).toBe(true);
    
    const fix = await engine.generateFix(result);
    expect(fix.suggested_code).toContain('process.env');
    expect(fix.suggested_code).toContain('API_KEY');
    
    // Test applying fix
    const fixedCode = await engine.applyFix(code, fix);
    expect(fixedCode).not.toContain('secret-key-12345');
    expect(fixedCode).toContain('process.env.API_KEY');
  });

  // TEST 6: Decision Evaluation
  test('TEST 6: Decision Evaluation', async () => {
    const options = [
      { name: 'MongoDB', type: 'nosql', features: ['horizontal-scaling', 'flexible-schema'] },
      { name: 'PostgreSQL', type: 'relational', features: ['acid-compliance', 'authentication', 'encryption'] },
      { name: 'SQLite', type: 'embedded', features: ['zero-configuration', 'lightweight'] }
    ];
    
    const context: EvaluationContext = {
      userId: 'test-user',
      projectType: 'web_app',
      tierOverride: 'beginner'
    };

    const evaluation = await engine.evaluateDecision('database_selection', options, context);
    
    expect(evaluation).toBeDefined();
    expect(evaluation.options).toHaveLength(3);
    expect(evaluation.recommendation).toBeDefined();
    expect(evaluation.recommendation.choice).toBeDefined();
    expect(evaluation.recommendation.reasoning).toBeDefined();
    expect(evaluation.recommendation.trade_offs.length).toBeGreaterThan(0);
    
    // Each option should have scores and recommendations
    evaluation.options.forEach(option => {
      expect(option.evaluation.security_score).toBeGreaterThanOrEqual(0);
      expect(option.evaluation.scalability_score).toBeGreaterThanOrEqual(0);
      expect(option.evaluation.complexity_score).toBeGreaterThanOrEqual(0);
    });
  });
});