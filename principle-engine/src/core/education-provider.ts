// src/core/education-provider.ts
import { Lesson, LabConfiguration, UserTier, PrincipleDefinition } from '../types';
import { PRINCIPLES } from '../principles/definitions';

export class EducationProvider {
  async getLesson(principleId: string, tier: string): Promise<Lesson> {
    const principle = PRINCIPLES.find(p => p.principle_id === principleId);
    
    if (!principle) {
      throw new Error(`Principle not found: ${principleId}`);
    }
    
    return {
      lesson_id: principle.education.lesson_id,
      principle_id: principle.principle_id,
      tier: tier as UserTier,
      content: {
        why: principle.education.why,
        how: principle.education.how,
        failure_example: principle.education.failure_example,
        analogy: principle.education.analogy,
        steps: [
          'Understand the vulnerability',
          'Identify problematic code',
          'Apply the fix template',
          'Verify the fix works',
          'Test for edge cases'
        ],
        resources: [
          `OWASP: ${principle.domain}`,
          principle.metadata.source,
          `Lab: ${principle.education.lesson_id}`
        ]
      }
    };
  }

  async getLab(principleId: string, tier: string): Promise<LabConfiguration> {
    const principle = PRINCIPLES.find(p => p.principle_id === principleId);
    
    if (!principle) {
      throw new Error(`Principle not found: ${principleId}`);
    }
    
    return {
      lab_id: principle.education.lesson_id,
      principle_id: principle.principle_id,
      tier: tier as UserTier,
      docker_config: {
        image: `security-labs/${principle.principle_id}:latest`,
        ports: ['8080:8080'],
        volumes: ['./workspace:/lab'],
        environment: {
          LAB_MODE: 'practice',
          USER_TIER: tier
        }
      },
      tasks: [
        {
          id: 'task-1',
          description: `Identify the ${principle.rule.name} vulnerability`,
          validation: 'Check if the code contains the vulnerable pattern'
        },
        {
          id: 'task-2',
          description: 'Apply the fix using the provided template',
          validation: 'Verify the fix follows the secure pattern'
        },
        {
          id: 'task-3',
          description: 'Test that the fix prevents the vulnerability',
          validation: 'Run security tests against the fixed code'
        }
      ]
    };
  }
}