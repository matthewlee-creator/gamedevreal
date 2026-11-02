/**
 * HOI4 Web Grand Strategy Engine - AI Decision & Personality Engine
 * Manages AI country personalities, difficulty scaling, and automated decisions.
 */

class AIPersonalityEngine {
  constructor(gameEngine) {
    this.game = gameEngine;

    // Difficulty scaling factors (applies ONLY to AI, never to the player)
    this.difficultyModifiers = {
      easy:   { aggressiveThreshold: 0.8, productionSpeed: 0.8, militaryFocusWeight: 0.4 },
      normal: { aggressiveThreshold: 0.5, productionSpeed: 1.0, militaryFocusWeight: 0.6 },
      hard:   { aggressiveThreshold: 0.3, productionSpeed: 1.3, militaryFocusWeight: 0.8 }
    };

    // Preset Ruler & Ideology Personalities[cite: 2]
    this.personalities = {
      GER: { ruler: "Adolf Hitler", stance: "EXPANSIONIST", riskTolerance: 0.9, targetIdeology: "fascism" },
      FRA: { ruler: "Albert Lebrun", stance: "DEFENSIVE", riskTolerance: 0.2, targetIdeology: "democratic" },
      SOV: { ruler: "Joseph Stalin", stance: "IDEOLOGICAL", riskTolerance: 0.6, targetIdeology: "communism" },
      GBR: { ruler: "Winston Churchill", stance: "DEFENSIVE", riskTolerance: 0.4, targetIdeology: "democratic" },
      ITA: { ruler: "Benito Mussolini", stance: "OPPORTUNISTIC", riskTolerance: 0.7, targetIdeology: "fascism" }
    };
  }

  /**
   * Executes daily AI routines across all non-player nations[cite: 2]
   */
  processDailyAITick() {
    const diff = this.difficultyModifiers[this.game.difficulty] || this.difficultyModifiers.normal;

    Object.keys(this.game.nations).forEach(tag => {
      // Skip player nation[cite: 2]
      if (tag === this.game.playerCountry) return;

      const nation = this.game.nations[tag];
      const personality = this.personalities[tag] || { stance: "NEUTRAL", riskTolerance: 0.3 };

      // 1. Manage AI Production & Allocations
      this.manageAIProduction(tag, nation, diff, personality);

      // 2. Evaluate Ideology & Civil War Risks[cite: 2]
      this.evaluateStabilityAndIdeology(tag, nation);
    });
  }

  /**
   * AI Production Allocation Logic
   */
  manageAIProduction(tag, nation, diff, personality) {
    // If AI has unallocated military factories, assign to equipment production
    const assignedFactories = nation.productionLines.reduce((sum, line) => sum + line.allocatedFactories, 0);
    const unassigned = nation.militaryFactories - assignedFactories;

    if (unassigned > 0) {
      let targetLine = nation.productionLines.find(l => l.item === 'infantry_equipment');
      if (!targetLine) {
        targetLine = { item: 'infantry_equipment', allocatedFactories: 0, progress: 0, outputRate: 12 };
        nation.productionLines.push(targetLine);
      }
      targetLine.allocatedFactories += unassigned;
    }

    // High military focus on higher difficulty levels[cite: 2]
    if (personality.stance === 'EXPANSIONIST' && Math.random() < diff.militaryFocusWeight * 0.05) {
      // Convert surplus civilian factories into military production over time
      if (nation.civilianFactories > 15) {
        nation.civilianFactories -= 1;
        nation.militaryFactories += 1;
      }
    }
  }

  /**
   * Evaluates AI choices when historical events occur[cite: 2]
   */
  evaluateEventChoice(event, optionList, countryTag) {
    const personality = this.personalities[countryTag] || { stance: "NEUTRAL", riskTolerance: 0.5 };
    const diff = this.difficultyModifiers[this.game.difficulty];

    // Aggressive expansionists favor historical conquest options[cite: 2]
    if (personality.stance === 'EXPANSIONIST') {
      const aggressiveOption = optionList.find(opt => opt.isAggressive || opt.isHistorical);
      if (aggressiveOption && Math.random() > (1 - personality.riskTolerance)) {
        return aggressiveOption.id;
      }
    }

    // Fallback: Default historical choice
    const defaultOpt = optionList.find(opt => opt.isHistorical) || optionList[0];
    return defaultOpt.id;
  }

  /**
   * Monitors AI stability drops and prevents/triggers civil wars[cite: 2]
   */
  evaluateStabilityAndIdeology(tag, nation) {
    if (nation.stability < 0.25 && Math.random() < 0.02) {
      // AI civil war risk handling[cite: 2]
      nation.stability = 0.40; // Soft reset for AI to keep sandbox playable
    }
  }
}