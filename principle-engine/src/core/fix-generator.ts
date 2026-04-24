// src/core/fix-generator.ts
import { EvaluationResult, FixSuggestion, PrincipleDefinition } from '../types';

export class FixGenerator {
  async generateFix(result: EvaluationResult): Promise<FixSuggestion> {
    const suggestedCode = result.fix.suggested_code;
    const originalCode = result.finding.code_snippet;
    
    const variables: Record<string, string> = {};
    
    // Extract variables from original code
    for (const varName of result.fix.variables_needed) {
      variables[varName] = this.extractVariable(originalCode, varName);
    }
    
    // Apply variables to template
    let finalCode = suggestedCode;
    for (const [key, value] of Object.entries(variables)) {
      finalCode = finalCode.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
    }
    
    return {
      principle_id: result.principle_id,
      fix_type: result.fix.fix_type as FixSuggestion['fix_type'],
      original_code: originalCode,
      suggested_code: finalCode,
      diff: result.fix.diff,
      variables
    };
  }

  async applyFix(code: string, fix: FixSuggestion): Promise<string> {
    return code.replace(fix.original_code, fix.suggested_code);
  }

  private extractVariable(code: string, varName: string): string {
    // Simple extraction logic
    switch (varName) {
      case 'var_name':
      case 'api_key':
      case 'token':
        const constMatch = code.match(/(?:const|let|var)\s+(\w+)/);
        return constMatch ? constMatch[1] : varName;
      
      case 'env_var_name':
        const nameMatch = code.match(/(?:const|let|var)\s+(\w+)/);
        return nameMatch ? nameMatch[1].toUpperCase().replace(/-/g, '_') : 'API_KEY';
      
      case 'password':
        return 'password';
      
      case 'table':
        return 'users';
      
      case 'column':
        return 'id';
      
      case 'user_input':
        const inputMatch = code.match(/req\.(?:params|query|body)\.(\w+)/);
        return inputMatch ? inputMatch[1] : 'userInput';
      
      case 'url':
        const urlMatch = code.match(/https?:\/\/[^\s"']+/);
        return urlMatch ? urlMatch[0] : 'https://example.com';
      
      case 'dto_name':
        return 'userDTO';
      
      case 'entity':
        return 'user';
      
      case 'auth_user_id':
        return 'req.user.id';
      
      case 'resource_id':
        return 'req.params.id';
      
      case 'route_path':
        return '/admin';
      
      case 'router_file':
        return 'routes/admin.js';
      
      case 'route_prefix':
        return '/api';
      
      case 'package':
        return 'lodash';
      
      case 'safe_version':
        return '4.17.21';
      
      case 'cve_id':
        return '2021-23337';
      
      case 'token_value':
        return 'token';
      
      case 'domain':
        return 'api.example.com';
      
      case 'bucket':
        return 'my-bucket';
      
      case 'project':
        return 'my-project';
      
      default:
        return varName;
    }
  }
}