// src/core/tier-manager.ts
import { TierConfig, UserTier, Domain } from '../types';

export class TierManager {
  private tierConfigs: Map<string, TierConfig> = new Map();

  constructor() {
    // Initialize with default tier configs for test users
    this.tierConfigs.set('user1', {
      user_id: 'user1',
      global_tier: 'beginner',
      adaptive_mode: true,
      domain_mastery: {
        security: { demonstrated_principles: ['secrets-zero-touch', 'input-fortress-sqli'], tier: 'intermediate' },
        system_design: { demonstrated_principles: [], tier: 'beginner' },
        devops: { demonstrated_principles: [], tier: 'beginner' },
        software_engineering: { demonstrated_principles: [], tier: 'beginner' }
      },
      override_history: []
    });
  }

  async getTierConfig(userId: string): Promise<TierConfig> {
    if (!this.tierConfigs.has(userId)) {
      // Create default config for new user
      const defaultConfig: TierConfig = {
        user_id: userId,
        global_tier: 'beginner',
        adaptive_mode: true,
        domain_mastery: {
          security: { demonstrated_principles: [], tier: 'beginner' },
          system_design: { demonstrated_principles: [], tier: 'beginner' },
          devops: { demonstrated_principles: [], tier: 'beginner' },
          software_engineering: { demonstrated_principles: [], tier: 'beginner' }
        },
        override_history: []
      };
      this.tierConfigs.set(userId, defaultConfig);
    }
    
    return this.tierConfigs.get(userId)!;
  }

  async updateTier(
    userId: string,
    domain: string,
    principleId: string,
    passed: boolean
  ): Promise<TierConfig> {
    const config = await this.getTierConfig(userId);
    
    if (domain in config.domain_mastery) {
      const domainKey = domain as keyof typeof config.domain_mastery;
      const domainConfig = config.domain_mastery[domainKey];
      
      if (passed && !domainConfig.demonstrated_principles.includes(principleId)) {
        domainConfig.demonstrated_principles.push(principleId);
      }
      
      // Recalculate tier based on demonstrated principles
      if (domainConfig.demonstrated_principles.length >= 3) {
        domainConfig.tier = 'advanced';
      } else if (domainConfig.demonstrated_principles.length >= 2) {
        domainConfig.tier = 'intermediate';
      }
    }
    
    // Recalculate global tier
    const tiers: UserTier[] = ['beginner', 'intermediate', 'advanced'];
    let lowestTier = 2; // advanced index
    
    for (const domainKey of Object.keys(config.domain_mastery)) {
      const domainTier = config.domain_mastery[domainKey as keyof typeof config.domain_mastery].tier;
      const tierIndex = tiers.indexOf(domainTier);
      if (tierIndex < lowestTier) {
        lowestTier = tierIndex;
      }
    }
    
    config.global_tier = tiers[lowestTier];
    
    return config;
  }
}